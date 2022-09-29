import Address                                     from './Address.model'
import Customer                                    from './Customer.model'
import Item                                        from './Item.model'
import User                                        from './User.model'
import Calculation                                 from './Calculation.model'
import Warehouse                                   from './Warehouse.model'
import WarehouseItem                               from './WarehouseItem.model'
import InvoiceItem                                 from './InvoiceItem.model'
import Invoice                                     from './Invoice.model'
import ReturnInvoice                               from './ReturnInvoice.model'
import Translate                                   from './Translate.model'
import ReceiptTemplate from './ReceiptTemplate.model'
import { ValidationError as ClassValidationError } from 'class-validator'
import { ArgumentValidationError }                 from 'type-graphql'
import Sequelize, { FindOptions }                  from 'sequelize'
import { IContextApp }                             from '../graphql/resolvers/basic'

const throwArgumentValidationError = (property: string, data: any, constrains: { [type: string]: string }): ArgumentValidationError => {
    const error = new ClassValidationError()
    error.target = data
    error.value = data[property]
    error.property = property
    error.constraints = constrains
    throw new ArgumentValidationError([error])
}

export const setUserFilterToWhereSearch = (options: FindOptions, ctx: IContextApp) => {

    if (options.where) {
        options.where = {
            [Sequelize.Op.and]: [
                { clientId: ctx.clientId },
                {
                    ...options.where
                }
            ]
        }
    } else {
        options.where = {
            clientId: ctx.clientId
        }
    }
    return options
}

export {
    throwArgumentValidationError,
    Address,
    Customer,
    Item,
    User,
    Calculation,
    Warehouse,
    WarehouseItem,
    InvoiceItem,
    Translate,
    Invoice,
    ReturnInvoice,
    ReceiptTemplate
}
