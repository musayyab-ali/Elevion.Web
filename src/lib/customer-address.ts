import api from "@/lib/api";

export type CustomerAddress = {
  AddressBookId: number;
  FullName: string;
  PhoneNumber: string;
  IsDefault: boolean;
  Address: string;
  CityId: number;
  CountryId: number;
  StateId: number;
  AreaId: number;
  Longitude: string;
  Latitude: string;
  CityName?: string;
  CountryName?: string;
  StateName?: string;
  AreaName?: string;
};

export type SaveCustomerAddressPayload = {
  AddressBookId: number;
  FullName: string;
  PhoneNumber: string;
  IsDefault: boolean;
  Address: string;
  CityId: number;
  CountryId: number;
  StateId: number;
  AreaId: number;
  Longitude: string;
  Latitude: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value).trim();
}

function looksLikeAddress(item: Record<string, unknown>): boolean {
  return (
    "AddressBookId" in item ||
    "AddressBookID" in item ||
    "addressBookId" in item ||
    "Address" in item ||
    "address" in item ||
    "FullAddress" in item ||
    "FullName" in item ||
    "fullName" in item
  );
}

export function mapAddress(raw: unknown): CustomerAddress | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const id = toNumber(
    item.AddressBookId ??
      item.AddressBookID ??
      item.addressBookId ??
      item.Id ??
      item.id,
  );
  const address = toStringValue(
    item.Address ?? item.address ?? item.FullAddress ?? item.fullAddress,
  );

  if (!address && id <= 0) return null;

  return {
    AddressBookId: id,
    FullName: toStringValue(
      item.FullName ?? item.fullName ?? item.Name ?? item.name,
    ),
    PhoneNumber: toStringValue(
      item.PhoneNumber ??
        item.phoneNumber ??
        item.Phone ??
        item.phone ??
        item.MobileNumber,
    ),
    IsDefault: Boolean(item.IsDefault ?? item.isDefault ?? item.Default),
    Address: address || "Saved address",
    CityId: toNumber(item.CityId ?? item.cityId),
    CountryId: toNumber(item.CountryId ?? item.countryId),
    StateId: toNumber(item.StateId ?? item.stateId),
    AreaId: toNumber(item.AreaId ?? item.areaId),
    Longitude: toStringValue(item.Longitude ?? item.longitude, "0") || "0",
    Latitude: toStringValue(item.Latitude ?? item.latitude, "0") || "0",
    CityName:
      toStringValue(item.CityName ?? item.City ?? item.cityName) || undefined,
    CountryName:
      toStringValue(item.CountryName ?? item.Country ?? item.countryName) ||
      undefined,
    StateName:
      toStringValue(item.StateName ?? item.State ?? item.stateName) || undefined,
    AreaName:
      toStringValue(item.AreaName ?? item.Area ?? item.areaName) || undefined,
  };
}

function extractAddressList(data: unknown): CustomerAddress[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map(mapAddress)
      .filter((item): item is CustomerAddress => Boolean(item));
  }

  if (typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const preferredKeys = [
    "AddressList",
    "Addresses",
    "CustomerAddressList",
    "CustomerAddresses",
    "addressList",
    "addresses",
    "Items",
    "items",
    "List",
    "list",
    "Records",
    "records",
    "Result",
    "result",
    "Data",
    "data",
  ];

  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const mapped = value
        .map(mapAddress)
        .filter((item): item is CustomerAddress => Boolean(item));
      if (mapped.length > 0) return mapped;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = extractAddressList(value);
      if (nested.length > 0) return nested;
    }
  }

  // Deep scan: first array of address-like objects
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (first && typeof first === "object" && looksLikeAddress(first as Record<string, unknown>)) {
        const mapped = value
          .map(mapAddress)
          .filter((item): item is CustomerAddress => Boolean(item));
        if (mapped.length > 0) return mapped;
      }
    }
  }

  const single = mapAddress(data);
  return single ? [single] : [];
}

function getResponseBody(response: unknown): unknown {
  if (!response || typeof response !== "object") return response;

  const record = response as Record<string, unknown>;

  // AxiosResponse: { data: { Data, Message, ... } }
  if ("data" in record && record.data != null) {
    const axiosData = record.data;
    if (axiosData && typeof axiosData === "object") {
      const body = axiosData as Record<string, unknown>;
      if ("Data" in body || "data" in body || "Message" in body) {
        return body.Data ?? body.data ?? axiosData;
      }
      return axiosData;
    }
    return axiosData;
  }

  // Already unwrapped API envelope
  if ("Data" in record || "Message" in record || "HttpStatusCode" in record) {
    return record.Data;
  }

  return response;
}

/**
 * GET /api/v1/Customer/addresses
 * Note: do NOT send CityId=0 — some backends treat it as a hard filter and return [].
 */
export async function fetchCustomerAddresses(options?: {
  pageSize?: number;
  pageNumber?: number;
  cityId?: number;
}): Promise<CustomerAddress[]> {
  const params: Record<string, number> = {
    PageSize: options?.pageSize ?? 20,
    PageNumber: options?.pageNumber ?? 1,
  };

  if (options?.cityId && options.cityId > 0) {
    params.CityId = options.cityId;
  }

  const response = await api.get("/api/v1/Customer/addresses", { params });
  const payload = getResponseBody(response);
  return extractAddressList(payload);
}

/** POST /api/v1/Customer/address/save */
export async function saveCustomerAddress(
  payload: SaveCustomerAddressPayload,
): Promise<CustomerAddress | null> {
  const response = await api.post("/api/v1/Customer/address/save", {
    AddressBookId: payload.AddressBookId || 0,
    FullName: String(payload.FullName ?? "").trim(),
    PhoneNumber: String(payload.PhoneNumber ?? "").trim(),
    IsDefault: Boolean(payload.IsDefault),
    Address: String(payload.Address ?? "").trim(),
    CityId: Number(payload.CityId) || 0,
    CountryId: Number(payload.CountryId) || 0,
    StateId: Number(payload.StateId) || 0,
    AreaId: Number(payload.AreaId) || 0,
    Longitude: String(payload.Longitude ?? "").trim() || "0",
    Latitude: String(payload.Latitude ?? "").trim() || "0",
  });

  const body = getResponseBody(response);
  const envelope =
    response && typeof response === "object" && "data" in response
      ? ((response as { data: Record<string, unknown> }).data as Record<
          string,
          unknown
        >)
      : (response as Record<string, unknown>);

  const type = String(envelope?.Type || "").toLowerCase();
  const status = Number(envelope?.HttpStatusCode ?? 200);
  if (type === "error" || type === "exception" || status >= 400) {
    throw new Error(String(envelope?.Message || "Failed to save address."));
  }

  return mapAddress(body);
}

export function buildSaveAddressPayloadFromCheckout(input: {
  addressBookId?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  address: string;
  postalCode?: string;
  cityId: string | number;
  countryId: string | number;
  stateId: string | number;
  areaId?: string | number;
  longitude?: string;
  latitude?: string;
  isDefault?: boolean;
}): SaveCustomerAddressPayload {
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const fromParts = `${firstName} ${lastName}`.trim();
  const fullName =
    String(input.fullName ?? "").trim() || fromParts || "Customer";
  const addressLine = [
    String(input.address ?? "").trim(),
    String(input.postalCode ?? "").trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    AddressBookId: Number(input.addressBookId) || 0,
    FullName: fullName,
    PhoneNumber: String(input.phone ?? "").trim(),
    IsDefault: Boolean(input.isDefault),
    Address: addressLine || "N/A",
    CityId: Number(input.cityId) || 0,
    CountryId: Number(input.countryId) || 0,
    StateId: Number(input.stateId) || 0,
    AreaId: Number(input.areaId) || 0,
    Longitude: String(input.longitude ?? "").trim() || "0",
    Latitude: String(input.latitude ?? "").trim() || "0",
  };
}
