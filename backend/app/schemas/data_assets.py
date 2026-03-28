from pydantic import BaseModel, Field


class DatasetMeta(BaseModel):
    generated_at: str | None = None
    source: str | None = None
    source_url: str | None = None
    license_note: str | None = None
    record_count: int | None = None


class AirportRecord(BaseModel):
    id: str
    ident: str = ""
    icao: str | None = None
    iata: str | None = None
    name: str
    type: str
    lat: float
    lon: float
    country_iso: str
    region_iso: str | None = None
    municipality: str | None = None
    scheduled_service: bool = False


class PortRecord(BaseModel):
    id: str
    name: str
    country: str
    lat: float
    lon: float
    unlocode: str | None = None
    wpi_number: str | None = None
    source: str | None = None
    state: str | None = None


class AirportsDataset(BaseModel):
    meta: DatasetMeta = Field(default_factory=DatasetMeta)
    airports: list[AirportRecord] = Field(default_factory=list)


class PortsDataset(BaseModel):
    meta: DatasetMeta = Field(default_factory=DatasetMeta)
    ports: list[PortRecord] = Field(default_factory=list)
