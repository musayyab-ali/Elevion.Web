"use client";

import React, { useState } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  CustomerAddress,
  deleteCustomerAddress,
} from "@/lib/customer-address";
import { getApiErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";

type ModalSavedAddressesProps = {
  open: boolean;
  addresses: CustomerAddress[];
  selectedAddressId?: number | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (address: CustomerAddress) => void;
  onUseNew: () => void;
  onDeleted: (addressBookId: number) => void;
};

/** Saved numbers are stored without the dial code, so it is prefixed here. */
function formatAddressPhone(address: CustomerAddress): string {
  const number = String(address.PhoneNumber ?? "").trim();
  if (!number) return "";
  if (number.startsWith("+")) return number;

  const code = String(address.PhoneCode ?? "").replace(/\D/g, "");
  if (!code) return number;

  return `+${code} ${number.replace(new RegExp(`^${code}`), "").trim() || number}`;
}

const ModalSavedAddresses = ({
  open,
  addresses,
  selectedAddressId = null,
  loading = false,
  onClose,
  onSelect,
  onUseNew,
  onDeleted,
}: ModalSavedAddressesProps) => {
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(
    null,
  );

  if (!open || addresses.length === 0) return null;

  const handleDelete = async (address: CustomerAddress) => {
    const addressBookId = Number(address.AddressBookId);
    if (!addressBookId) {
      toast.error("This address cannot be removed because its ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${address.FullName || "this saved address"}?`,
    );
    if (!confirmed) return;

    setDeletingAddressId(addressBookId);
    try {
      const message = await deleteCustomerAddress(addressBookId);
      onDeleted(addressBookId);
      toast.success(message);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not remove the saved address."),
      );
    } finally {
      setDeletingAddressId(null);
    }
  };

  return (
    <div className="checkout-address-modal-overlay" onClick={onClose}>
      <div
        className="checkout-address-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-address-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkout-address-modal-head">
          <div className="min-w-0">
            <div className="checkout-address-modal-eyebrow">Saved Addresses</div>
            <h3 id="checkout-address-modal-title" className="heading5 mt-1">
              Choose delivery address
            </h3>
            <p className="caption1 text-secondary mt-1">
              Select a saved address, or continue with a new one.
            </p>
          </div>
          <button
            type="button"
            className="checkout-address-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon.X size={16} weight="bold" />
          </button>
        </div>

        <div className="checkout-address-modal-body">
          {loading ? (
            <div className="checkout-address-loading">Loading addresses...</div>
          ) : (
            <div className="checkout-address-modal-list">
              {addresses.map((address) => {
                const isSelected = selectedAddressId === address.AddressBookId;
                const locationBits = [
                  address.AreaName,
                  address.CityName,
                  address.StateName,
                  address.CountryName,
                ].filter(Boolean);

                const isDeleting =
                  deletingAddressId === address.AddressBookId;

                return (
                  <div
                    key={address.AddressBookId || address.Address}
                    className={`checkout-address-card${isSelected ? " is-selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="checkout-address-card-select"
                      onClick={() => onSelect(address)}
                      disabled={isDeleting}
                    >
                      <div className="checkout-address-card-top">
                        <div className="checkout-address-card-name">
                          <Icon.MapPin
                            size={16}
                            weight="fill"
                            className="shrink-0"
                          />
                          <span>{address.FullName || "Saved Address"}</span>
                        </div>
                        {address.IsDefault && (
                          <span className="checkout-address-default">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="checkout-address-card-line">
                        {address.Address}
                      </div>
                      {locationBits.length > 0 && (
                        <div className="checkout-address-card-line">
                          {locationBits.join(", ")}
                        </div>
                      )}
                      {address.PhoneNumber && (
                        <div className="checkout-address-card-line">
                          <Icon.Phone size={13} weight="fill" />
                          {formatAddressPhone(address)}
                        </div>
                      )}
                    </button>
                    <div className="checkout-address-card-actions">
                      <button
                        type="button"
                        className="checkout-address-card-cta"
                        onClick={() => onSelect(address)}
                        disabled={isDeleting}
                      >
                        Use this address
                        <Icon.ArrowRight size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className="checkout-address-card-delete"
                        onClick={() => void handleDelete(address)}
                        disabled={deletingAddressId !== null}
                        aria-label={`Delete ${address.FullName || "saved address"}`}
                      >
                        <Icon.Trash size={14} weight="bold" />
                        {isDeleting ? "Removing..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="checkout-address-modal-foot">
          <button
            type="button"
            className="checkout-address-modal-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-main checkout-address-modal-new"
            onClick={onUseNew}
          >
            <Icon.Plus size={16} weight="bold" />
            Use New Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSavedAddresses;
