from .local import LocalConnector
from .s3 import S3Connector
from .azure import AzureConnector
from .gcs import GCSConnector
from .database import DatabaseConnector

CONNECTORS = {
    "local": LocalConnector(),
    "s3": S3Connector(),
    "azure": AzureConnector(),
    "gcs": GCSConnector(),
    "postgres": DatabaseConnector(),
    "database": DatabaseConnector(),
}
