export const ITEM_MAX_PRICE = 1000000
export const ITEM_MAX_QUANTITY = 1000000

export const SETTINGS = {
    RECORD_TYPE_APPLICATION: 'A',
    KEY_APPLICATION_CONFIRM_EMAIL: 'APPLICATION_CONFIRM_EMAIL_SETTINGS',
    KEY_APPLICATION_CONFIRM_EMAIL_TEXT: 'APPLICATION_CONFIRM_TEXT_EMAIL',
    KEY_APPLICATION_SETTINGS: 'APPLICATION_DEFAULT_SETTINGS',
    KEY_APPLICATION_RECEIPT_TEMPLATE: 'APPLICATION_RECEIPT_TEMPLATE',
    KEY_APPLICATION_WEBSOCKET_SETTINGS: 'APPLICATION_WEBSOCKET_SETTINGS'
}

export const CONSTANT_MODEL = {
    EMAIL_STATUS: {
        NOT_SENT: 0,
        SENT: 1
    },
    BANK_TRANSACTION_STATUS: {
        DELETED: 0,
        ACTIVE: 1,
        OPENED: 2
    },
    USER_STATUS: {
        REQUESTED: 0,
        APPROVED: 8,
        ACTIVE: 1,
        NOT_ACTIVE: 2,
        DELETED: 4
    },
    STATUS: {
        DELETED: 0,
        ACTIVE: 1,
        NOT_ACTIVE: 2
    },
    NORMATIVE: {
        ACTIVE: 1,
        NOT_ACTIVE: 2,
    },
    PRODUCTION_ORDER: {
        OPENED: 1,
        IN_PROGRESS: 2,
        FINISHED: 3,
        DELETED: 4
    },
    TAX_FINANCE: {
        CLOSED: 4, /** used in advance invoice to mark document that completely used in invoice */
        DELETED: 3,
        ACTIVE: 2,
        OPENED: 1
    },
    FINANCE_DOCUMENT_TYPE: {
        TRANSFER: 1,
        ADVANCE: 2
    },
    TAX_FINANCE_FLAG: {
        IN: 0,
        OUT: 1
    },
    CUSTOMER_INFO_KEYS: {
        BANK_ACCOUNT: 'BANK_ACCOUNT'
    },
    PAID_STATUS: {
        NOT_PAID: 0,
        FINISHED: 1
    },
    CALCULATION_STATUS: {
        OPENED: 1,
        SAVED: 2,
        BOOKED: 3,
        VOID: 4,
        VALIDATE: 5,
        RECALCULATE: 6
    },
    INVOICE_STATUS: {
        OPENED: 1,
        SAVED: 2,
        CANCELED: 3,
    },
    DUE_DATES_STATUS: {
        OPENED: 1,
        ACTIVE: 2,
        DELETED: 3,
    },
    WORK_ORDER_STATUS: {
        OPENED: 1,
        SAVED: 2,
        CANCELED: 3
    },
    PROFORMA_INVOICE_STATUS: {
        OPENED: 1,
        SAVED: 2,
        FINISHED: 3,
        CANCELED: 4,
    },
    ADVANCE_INVOICE_STATUS: {
        SAVED: 1, /**  when saved and not still used */
        FINISHED: 2, /** when all finance is used by invoice, if  used partial then still not finished */
        CANCELED: 3,
    },
    INVOICE_ADVANCE_INVOICE_STATUS: {
        OPENED: 1, /**  when selected in some invoice but invoice is not finished / closed */
        FINISHED: 2, /** when used by invoice */
        CANCELED: 3,
    },
    RECEIPT_TEMPLATE_STATUS: {
        NOT_ACTIVE: 0,
        ACTIVE: 1,
        USING: 2
    }
}

export enum CONSTANT_ADDRESS_TYPES {
    HOME,
    HEADQUARTERS,
    WAREHOUSE,
    SHOP

}

export enum CONSTANT_CONTACT_TYPES {
    'PHONE',
    'MOBILE',
    'FAX',
    'EMAIL',
    'WEBSITE'
}

export const WAREHOUSE_ITEM = {
    FLAG_CLAIMS: 1,
    FLAG_OWES: 0
}

export enum DISCOUNT_SURCHARGE {
    DISCOUNT,
    SURCHARGE
}

export enum DISCOUNT_SURCHARGE_TYPE {
    FINANCE,
    PERCENT
}

export enum CALCULATION_ITEM_TYPE {
    FINANCE_NO_VAT = 1,
    FINANCE_WITH_VAT = 2,
    PRICE_NO_VAT = 4,
    PRICE_WITH_VAT = 8
}

export enum WAREHOUSE_TYPE {
    WHOLESALE = 1,
    RETAIL = 2
}

export enum INVOICE_USE_DISCOUNT {
    NOT_ACTIVE = 0,
    ACTIVE = 1,
}

export enum BANK_TRANSACTION_FLAG {
    OWES = 0,
    CLAIMS = 1
}

export enum INDEX_RELATIONS_TYPE {
    CATEGORY= 1
}

export enum IMAGE_TYPES {
    PRIMARY=0
}

export enum SELLING_PANEL_TYPE {
    PANEL=0,
    FOLDER=1
}

export enum SELLING_PANEL_ITEM_PRICE_IMAGE_FLAG {
    NOT_USE= 0,
    USE=1
}

