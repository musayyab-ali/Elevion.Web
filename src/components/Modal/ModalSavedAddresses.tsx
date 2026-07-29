"use client";

import React from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { CustomerAddress } from "@/lib/customer-address";

type ModalSavedAddressesProps = {
  open: boolean;
  addresses: CustomerAddress[];
  selectedAddressId?: number | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (address: CustomerAddress) => void;
  onUseNew: () => void;
};

const ModalSavedAddresses = ({
  open,
  addresses,
  selectedAddressId = null,
  loading = false,
  onClose,
  onSelect,
  onUseNew,
}: ModalSavedAddressesProps) => {
  if (!open || addresses.length === 0) return null;

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

                return (
                  <button
                    key={address.AddressBookId || address.Address}
                    type="button"
                    className={`checkout-address-card${isSelected ? " is-selected" : ""}`}
                    onClick={() => onSelect(address)}
                  >
                    <div className="checkout-address-card-top">
                      <div className="checkout-address-card-name">
                        <Icon.MapPin size={16} weight="fill" className="shrink-0" />
                        <span>{address.FullName || "Saved Address"}</span>
                      </div>
                      {address.IsDefault && (
                        <span className="checkout-address-default">Default</span>
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
                        {address.PhoneNumber}
                      </div>
                    )}
                    <div className="checkout-address-card-cta">
                      Use this address
                      <Icon.ArrowRight size={14} weight="bold" />
                    </div>
                  </button>
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
