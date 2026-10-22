"""
PulseCart: Exasol Connection and Query Handler
===============================================
This module manages database connections and query execution against Exasol
using the high-performance `pyexasol` client.

Key Exasol Architecture Features:
- Native WebSocket communication with SSL verification bypass for local deployment.
- Dynamic credential resolution from local Exasol secrets storage.
- Dict-oriented query execution with lowercase identifier mapping.
- Native safe quoting and parameter binding via ExaFormatter.
"""

import json
import logging
import os
import re
import ssl
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

import pyexasol

logger = logging.getLogger("pulsecart.database")
logging.basicConfig(level=logging.INFO)

# Default Exasol connection configuration
EXASOL_DSN = os.getenv("EXASOL_DSN", "127.0.0.1:8563")
EXASOL_USER = os.getenv("EXASOL_USER", "sys")
EXASOL_SCHEMA = os.getenv("EXASOL_SCHEMA", "PULSECART")

# Path to local Exasol deployment secrets
SECRETS_FILE_PATH = Path(
    os.getenv(
        "EXASOL_SECRETS_PATH",
        r"C:\Users\admin\.exasol\personal\deployments\default\secrets.json",
    )
)


def get_exasol_password() -> str:
    """
    Dynamically loads the Exasol database password from local secrets or environment.
    
    Checks in the following order:
    1. EXASOL_PASSWORD environment variable (if explicitly overridden).
    2. Local Exasol deployment secrets.json (checks 'dbPassword', 'database_password', 'password').
    """
    env_password = os.getenv("EXASOL_PASSWORD")
    if env_password:
        return env_password

    if not SECRETS_FILE_PATH.exists():
        raise FileNotFoundError(
            f"Exasol secrets file not found at: {SECRETS_FILE_PATH}. "
            "Ensure Exasol personal deployment is initialized or set EXASOL_PASSWORD."
        )

    try:
        with open(SECRETS_FILE_PATH, "r", encoding="utf-8") as f:
            secrets_data = json.load(f)

        # Look for the database password key
        password = (
            secrets_data.get("dbPassword")
            or secrets_data.get("database_password")
            or secrets_data.get("password")
            or secrets_data.get("db_password")
            or secrets_data.get("database")
        )

        if not password:
            available_keys = list(secrets_data.keys())
            raise KeyError(
                f"No recognized password key in secrets.json. Available keys: {available_keys}"
            )

        return str(password)
    except Exception as e:
        logger.error(f"Failed to read Exasol credentials from {SECRETS_FILE_PATH}: {e}")
        raise


def get_connection(schema: Optional[str] = None) -> pyexasol.ExaConnection:
    """
    Creates and returns a new pyexasol connection to the Exasol cluster.

    Exasol Specifics:
    - `websocket_sslopt={'cert_reqs': ssl.CERT_NONE}` disables SSL certificate validation
      for local test/container deployments.
    - `fetch_dict=True` configures pyexasol to return query rows as Python dictionaries.
    - `lower_ident=True` converts uppercase Exasol identifiers to lowercase dict keys.
    - `autocommit=True` guarantees immediate visibility across concurrent API threads.
    """
    password = get_exasol_password()
    target_schema = schema or EXASOL_SCHEMA

    connection = pyexasol.connect(
        dsn=EXASOL_DSN,
        user=EXASOL_USER,
        password=password,
        schema=target_schema,
        autocommit=True,
        fetch_dict=True,
        lower_ident=True,
        # Required for local self-signed certificates
        websocket_sslopt={"cert_reqs": ssl.CERT_NONE},
    )
    return connection


@contextmanager
def db_session(schema: Optional[str] = None) -> Generator[pyexasol.ExaConnection, None, None]:
    """
    Context manager that yields an active Exasol connection and ensures
    proper cleanup when finished.
    """
    con = None
    try:
        con = get_connection(schema=schema)
        yield con
    finally:
        if con is not None:
            try:
                con.close()
            except Exception as e:
                logger.warning(f"Error while closing Exasol connection: {e}")


def _bind_parameters(con: pyexasol.ExaConnection, query: str, params: Optional[Dict[str, Any]] = None) -> str:
    """
    Safely binds parameters into SQL queries using Exasol's native quotation rules.
    Supports :named_parameter placeholders.
    Numbers and booleans are formatted unquoted so LIMIT clauses and arithmetic work natively.
    """
    if not params:
        return query

    formatted_query = query
    # Sort keys by length descending to prevent substring collisions (e.g., :param_id vs :param)
    for key in sorted(params.keys(), key=len, reverse=True):
        val = params[key]
        if val is None:
            quoted_val = "NULL"
        elif isinstance(val, bool):
            quoted_val = "TRUE" if val else "FALSE"
        elif isinstance(val, (int, float)):
            quoted_val = str(val)
        else:
            quoted_val = str(con.format.quote(val))

        pattern = rf":{re.escape(key)}\b"
        formatted_query = re.sub(pattern, lambda _: quoted_val, formatted_query)

    return formatted_query


def execute_query(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Executes a SELECT query on Exasol and returns the result as a list of dictionaries.

    Args:
        query: SQL query string (supports :param placeholders).
        params: Dictionary containing query parameter bindings.

    Returns:
        List of dictionaries where keys are lowercase column names.
    """
    with db_session() as con:
        bound_query = _bind_parameters(con, query, params)
        stmt = con.execute(bound_query)
        results = stmt.fetchall()
        return results if results is not None else []


def execute_statement(query: str, params: Optional[Dict[str, Any]] = None) -> int:
    """
    Executes an INSERT, UPDATE, DELETE, or DDL statement against Exasol.

    Args:
        query: SQL statement string (supports :param placeholders).
        params: Dictionary containing statement parameter bindings.

    Returns:
        Number of rows affected (rowcount).
    """
    with db_session() as con:
        bound_query = _bind_parameters(con, query, params)
        stmt = con.execute(bound_query)
        return getattr(stmt, "rowcount", 0)


def test_connection() -> Dict[str, Any]:
    """
    Validates connection health against Exasol and reports cluster metadata.
    """
    try:
        with db_session() as con:
            res = con.execute("SELECT 1 AS status, CURRENT_TIMESTAMP AS ts").fetchall()
            return {
                "status": "healthy",
                "dsn": EXASOL_DSN,
                "user": EXASOL_USER,
                "schema": EXASOL_SCHEMA,
                "response": res,
            }
    except Exception as e:
        logger.error(f"Exasol connection check failed: {e}")
        return {
            "status": "unhealthy",
            "dsn": EXASOL_DSN,
            "error": str(e),
        }


if __name__ == "__main__":
    print("Testing connection to Exasol...")
    status = test_connection()
    print("Connection status:", json.dumps(status, indent=2, default=str))
