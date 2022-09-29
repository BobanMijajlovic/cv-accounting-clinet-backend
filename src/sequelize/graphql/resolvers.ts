import {
    Address,
    Calculation,
    Customer,
    InvoiceItem,
    Item,
    User,
    Warehouse,
    WarehouseItem,
    Translate,
    Invoice,
    ReturnInvoice,
    ReceiptTemplate
} from '../models'

import Auth from '../../sequelize/graphql/resolvers/Auth'

export default [
    Address,
    Customer,
    Item,
    User,
    Calculation,
    Warehouse,
    WarehouseItem,
    Auth,
    InvoiceItem,
    Translate,
    Invoice,
    ReturnInvoice,
    ReceiptTemplate
]
