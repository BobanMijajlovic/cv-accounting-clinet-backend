import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                    from 'type-graphql'
import {
    AutoIncrement,
    BeforeCreate,
    BeforeUpdate,
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Max,
    Min,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                    from 'sequelize-typescript'
import Client        from './Client.model'
import {modelSTATUS} from './validations'

import Sequelize                  from 'sequelize'
import {
    Customer,
    InvoiceItem,
    setUserFilterToWhereSearch,
    throwArgumentValidationError,
    WarehouseItem
}                                 from './index'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseArray,
    TModelResponseSelectAll
}                                 from '../graphql/resolvers/basic'
import {
    ItemImageType,
    ItemType
} from '../graphql/types/Item'
import {
    add as _add,
    flatten as _flatten,
    get as _get,
    omit as _omit,
    round as _round,
    uniq as _uniq
}                                 from 'lodash'
import ItemSupplier               from './ItemSupplier.model'
import Tax                        from './Tax.model'
import {checkJWT}                 from '../graphql/middlewares'
import {
    CONSTANT_MODEL,
    ITEM_MAX_PRICE
}                                 from '../constants'
import config                     from '../../../config/index'
import {TransactionItemSummarize} from '../graphql/types/Customer'
import {
    differenceInCalendarDays,
    endOfMonth,
    format,
    isAfter,
    startOfMonth
}                                 from 'date-fns'
import {endOfToday}               from '../../utils'
import ReceiptItem                from './ReceiptItem.model'
import Invoice                    from './Invoice.model'
import Normative                  from './Normative.model'
import ItemsCategory              from './ItemsCategory.model'
import crypto                     from 'crypto-js'
import ItemsImages                from './ItemsImages.model'
import Category                   from './Category.model'
import {fixItemsDataBase}         from '../../google-api/GoogleAPI'

const JsonFormatter = {
    stringify: function(cipherParams) {
        const jsonObj = {ct: cipherParams.ciphertext.toString(crypto.enc.Base64)}
        return JSON.stringify(jsonObj)
    },
    parse: function(jsonStr) {
        const jsonObj = JSON.parse(jsonStr)
        const cipherParams = crypto.lib.CipherParams.create({
            ciphertext: crypto.enc.Base64.parse(jsonObj.ct)
        })
        return cipherParams
    }
}

export const decryptImageData = (hash: string) => {
    const {filePrivateKey} = config
    const bytes = crypto.AES.decrypt(hash, filePrivateKey)
    return JSON.parse(bytes.toString(crypto.enc.Utf8))
}

export const encryptImageData = async (data: any) => {
    const {filePrivateKey} = config
    const str = JSON.stringify(data)
    return crypto.AES.encrypt(str, filePrivateKey).toString()
}

@ObjectType()
@Table({
    tableName: 'item'
})

export default class Item extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(16),
        field: 'bar_code',
        validate: {
            isValid: (value) => {
                if (!value) {
                    return true
                }
                if (!/^[0-9]+$/.exec(value)) {
                    throw Error('Bar code can consist only numbers !')
                }
            }
        }
    })
    barCode: string

    @Field(type => Int, {nullable: true})
    // @Min(1)
    @Column({
        allowNull: true,
        type: DataType.INTEGER
    })
    code: number

    @Field(type => Int)
    @Min(0)
    @Max(50)
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.INTEGER,
        comment: 'department'
    })
    type: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(32),
        field: 'short_name'
    })
    shortName: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(255),
        field: 'full_name'
    })
    fullName: string

    @Field(type => Int)
    @Min(0)
    @Max(50)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        defaultValue: 0,
        comment: 'Unit of measure'
    })
    uom: number

    @Max(ITEM_MAX_PRICE)
    @Min(0)
    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        comment: 'retail price'
    })
    mp: number

    @Max(ITEM_MAX_PRICE)
    @Min(0)
    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.DECIMAL(10, 2),
        comment: 'wholesale price'
    })
    vp: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date

    @Field(type => Client)
    @BelongsTo(() => Client)
    client: Client

    @Field(type => Tax, {nullable: true})
    @BelongsTo(() => Tax)
    tax: Tax

    @Field(type => [ItemSupplier], {nullable: true})
    @HasMany(() => ItemSupplier)
    itemSuppliers: ItemSupplier[]

    @Field(type => [WarehouseItem], {nullable: true})
    @HasMany(() => WarehouseItem)
    warehouseItems: WarehouseItem[]

    @Field(type => [Normative], {nullable: true})
    @HasMany(() => Normative)
    norms: Normative[]

    @Field(type => [ItemsImages], {nullable: true})
    @HasMany(() => ItemsImages)
    images: ItemsImages[]

    @Field(type => [Category], {nullable: true})
    @BelongsToMany(() => Category, () => ItemsCategory, 'itemId', 'categoryId')
    category: Category[]

    static async _validate (instance: Item, options: any, update: boolean) {
        /** must be define short name or full name */
        if ((!instance.shortName || instance.shortName.trim().length === 0) && (!instance.fullName || instance.fullName.trim().length === 0)) {
            throwArgumentValidationError('shortName', instance, {message: 'Short Name or Full Name must be define'})
        }

        !instance.mp && !instance.vp && throwArgumentValidationError('vp', instance, {message: 'WP or RP must be define'})

        /** must have code or barCode */
        !instance.code && !instance.barCode && throwArgumentValidationError('code', instance, {message: 'Code or Bar Code  must be define'})

        const checkUniqueCode = async () => {
            const Op = Sequelize.Op
            if (instance.code && instance.barCode) {
                const item = await Item.findOne({
                    where: {
                        [Op.and]: [
                            {clientId: instance.clientId},
                            {
                                [Op.or]: [
                                    {code: instance.code},
                                    {barCode: instance.barCode}
                                ]
                            }]
                    },
                    ...options
                })
                item && item.code === instance.code && (!update || item.id !== instance.id) && throwArgumentValidationError('code', instance, {message: 'Item with this code exists'})
                item && item.barCode === instance.barCode && (!update || item.id !== instance.id) && throwArgumentValidationError('barCode', instance, {message: 'Item with this barCode exists'})
            }

            if (instance.code) {
                const item = await Item.findOne({
                    where: {
                        clientId: instance.clientId,
                        code: instance.code
                    },
                    ...options
                })
                item && (!update || item.id !== instance.id) && throwArgumentValidationError('code', instance, {message: 'Item with this code exists'})
            }

            const item = await Item.findOne({
                where: {
                    clientId: instance.clientId,
                    barCode: instance.barCode
                },
                ...options
            })
            item && (!update || item.id !== instance.id) && throwArgumentValidationError('barCode', instance, {message: 'Item with this barCode exists'})
        }
        await checkUniqueCode()
    }

    /** hooks */
    @BeforeCreate({name: 'beforeCreateHook'})
    static async _beforeCreateHook (instance: Item, options: any) {
        await Item._validate(instance, options, false)
    }

    @BeforeUpdate({name: 'beforeUpdateHook'})
    static async _beforeUpdateHook (instance: Item, options: any) {
        await Item._validate(instance, options, true)
    }

    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<Item> {
        return Item.findOne({
            where: {
                id,
                clientId: ctx.clientId
            },
            include: [
                {
                    required: false,
                    model: Tax
                },
                {
                    required: false,
                    model: ItemSupplier,
                    where: {
                        status: CONSTANT_MODEL.STATUS.ACTIVE
                    },
                    include: [
                        {
                            model: Customer,
                            as: 'supplier'
                        },
                    ]
                },
                {
                    required: false,
                    model: Normative,
                    where: {
                        status: CONSTANT_MODEL.NORMATIVE.ACTIVE
                    },
                },
                {
                    required: false,
                    model: ItemsImages
                },
                {
                    required: false,
                    model: Category
                }
            ]
        })
    }

    /** Function is used by BaseResolver */
    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Item> {

        /* options = {
             ...options,
             ...{
                 include: [
                     {
                         required: false,
                         model: ItemSupplier,
                         where: {
                             status: CONSTANT_MODEL.STATUS.ACTIVE
                         },
                         include: [
                             {
                                 model: Customer,
                                 as: 'supplier'
                             }
                         ]
                     }
                 ]
             }
         }*/

        options = setUserFilterToWhereSearch(options, ctx)
        return Item.findAndCountAll(options)
    }

    public static async insertOne (data: ItemType, ctx: IContextApp): TModelResponse<Item> {
        const transaction = await Item.sequelize.transaction()
        const options = {transaction}

        try {
            const _data = _omit(data, ['supplierItem'])

            const item = await Item.create({
                ..._data,
                clientId: ctx.clientId
            }, options)

            if (data.itemSuppliers) {
                const promises = data.itemSuppliers.map((itemSupplier: ItemSupplier) => {
                    return ItemSupplier.create({
                        ...itemSupplier,
                        itemId: item.id
                    }, options)
                })
                await Promise.all(promises)
            }

            if (data.categoryId) {
                await ItemsCategory.create({
                    itemId: item.id,
                    categoryId: data.categoryId,
                }, options)
            }

            if (data.image) {
                await ItemsImages.insertItemImage(Number(item.id), data.image, ctx, options)
            }
            // throwArgumentValidationError('id', {}, {message: 'Error'})
            await transaction.commit()
            return Item.selectOne(item.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)

        }
    }

    public static async insertBulk (data: ItemType[], ctx: IContextApp): Promise<string> {
        const transaction = await Item.sequelize.transaction()
        const options = {transaction}

        try {
            (() => {
                let notValid = data.every(item => !!item.barCode || !!item.code)
                if (!notValid) {
                    throwArgumentValidationError('barCode', {}, {message: 'BarCode or code  must me define'})
                }
                notValid = data.every(instance => !((!instance.shortName || instance.shortName.trim().length === 0) && (!instance.fullName || instance.fullName.trim().length === 0)))
                if (!notValid) {
                    throwArgumentValidationError('shortName', {}, {message: 'Short Name or Full Name must be define'})
                }
                data.filter(item => !!item.itemSuppliers && item.itemSuppliers.length > 0).map(item => {

                    const items = _uniq(item.itemSuppliers.filter(i => i.code > 0).map(i => i.code))
                    if (items.length !== item.itemSuppliers.length) {
                        throwArgumentValidationError('supplier item', {}, {message: 'Supplier item code must be unique'})
                    }
                })
            })()

            const barCodes = data.filter(item => !!item.barCode).map(item => item.barCode)
            if (barCodes.length > 0) {
                const values = _uniq(barCodes)
                if (values.length !== barCodes.length) {
                    throwArgumentValidationError('barCode', {}, {message: 'BarCode must me unique'})
                }

                const _items = await Item.findAll({
                    where: {
                        clientId: ctx.clientId,
                        barCode: barCodes
                    },
                    ...options
                })
                if (_items.length !== 0) {
                    throwArgumentValidationError('barCode', _items[0], {message: 'BarCode exists in base'})
                }
            }

            const codes = data.filter(item => !!item.code).map(item => item.code)
            if (codes.length > 0) {
                const values = _uniq(codes)
                if (values.length !== codes.length) {
                    throwArgumentValidationError('code', {}, {message: 'Code must me unique'})
                }

                const _items = await Item.findAll({
                    where: {
                        clientId: ctx.clientId,
                        code: codes
                    },
                    ...options
                })
                if (_items.length !== 0) {
                    throwArgumentValidationError('code', _items[0], {message: 'Code exists in base'})
                }
            }

            const items = data.map(item => {
                const _item = _omit(item, ['supplierItem', 'categoryId'])
                return {
                    ..._item,
                    clientId: ctx.clientId
                }
            })

            const results = await Item.bulkCreate(items, options)

            const itemSuppliers = _flatten(data.filter(item => !!item.itemSuppliers && item.itemSuppliers.length > 0).map(item => {

                const itemRecorded = results.find(i => i.barCode === item.barCode || i.code === item.code)

                if (!itemRecorded) {
                    return null
                }
                return item.itemSuppliers.map(itemSup => ({
                    ...itemSup,
                    itemId: itemRecorded.id
                }))
            })
                .filter(item => !!item))

            const itemCategories = _flatten(data.filter(item => !!item.categoryId).map(item => {

                const itemRecorded = results.find(i => i.barCode === item.barCode || i.code === item.code)

                if (!itemRecorded) {
                    return null
                }
                return {
                    categoryId: item.categoryId,
                    itemId: itemRecorded.id
                }
            })
                .filter(item => !!item))

            await ItemSupplier.bulkCreate(itemSuppliers, options)
            const promise = itemCategories.map(x => ItemsCategory.insertUpdate(0, x, ctx, options))
            await Promise.all(promise)

            const itemImages = _flatten(data.filter(item => !!item.image).map(item => {

                const itemRecorded = results.find(i => i.barCode === item.barCode || i.code === item.code)

                if (!itemRecorded) {
                    return null
                }
                return {
                    image: item.image,
                    itemId: itemRecorded.id
                }
            })
                .filter(item => !!item))

            const imgPromise = itemImages.map(x => ItemsImages.insertItemImage(Number(x.itemId), x.image, ctx, options))
            await Promise.all(imgPromise)

            await transaction.commit()
            return 'OK'
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async updateOne (id: number, data: ItemType, ctx: IContextApp): TModelResponse<Item> {
        const transaction = await Item.sequelize.transaction()
        const options = {transaction}
        try {
            const item = await Item.findOne({
                where: {
                    id,
                    clientId: ctx.clientId
                },
                ...options
            })
            if (!item) {
                throwArgumentValidationError('id', {}, {message: 'Item not exists'})
            }

            const _data = _omit(data, ['supplierItem'])
            await item.update(_data, options)
            if (data.itemSuppliers) {
                const promises = data.itemSuppliers.map((itemSupplier: ItemSupplier) => {
                    return ItemSupplier.create({
                        ...itemSupplier,
                        itemId: item.id
                    }, options)
                })
                await Promise.all(promises)
            }

            if (data.categoryId) {
                const itemCategory = await ItemsCategory.findOne({
                    where: {
                        itemId: item.id
                    },
                    ...options
                })
                const id = itemCategory ? itemCategory.id : 0
                await ItemsCategory.insertUpdate(id, {
                    categoryId: data.categoryId,
                    itemId: item.id
                }, ctx, options)
            }

            if (data.image) {
                /** filename_mimetype_encoding_dateTime */

                const itemImage = await ItemsImages.findOne({
                    where: {
                        itemId: item.id
                    },
                    ...options
                })
                if (itemImage && itemImage.id) {
                    await ItemsImages.deleteItemImage(itemImage.id, ctx, options)
                }
                await ItemsImages.insertItemImage(Number(item.id), data.image, ctx, options)
                // const decryptedData = await decryptImageData(fileData.name)
            }

            //  throwArgumentValidationError('id', {}, {message: 'Error'})
            await transaction.commit()
            return Item.selectOne(id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async itemsByArrayIds (ids: number[], ctx: IContextApp, options?: any): TModelResponseArray<Item> {
        ids = _uniq(ids)
        const items = await Item.findAll({
            where: {
                id: ids,
                clientId: ctx.clientId
            },
            ...(options ? options : {})
        })

        if (ids.length !== items.length) {
            throwArgumentValidationError('id', {}, {message: 'Some Item not exists'})
        }
        return items
    }

    /** sale */

    public static async getSalesByItem (itemId: number, ctx: IContextApp, dateStart?: Date, dateEnd?: Date) {
        const res = ReceiptItem.findAll({
            where: {
                itemId: itemId,
                clientId: ctx.clientId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            group: ['ReceiptItem.date'],
            attributes: [
                'date',
                [Sequelize.fn('sum', Sequelize.col('quantity')), 'quantity'],
                [Sequelize.fn('sum', Sequelize.col('finance_final_vp')), 'financeFinalVP'],
                [Sequelize.fn('sum', Sequelize.col('tax_finance')), 'taxFinance']
            ],
        })

        const inv = Invoice.findAll({
            where: {
                clientId: ctx.clientId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
                status: CONSTANT_MODEL.INVOICE_STATUS.SAVED
            },
            group: ['Invoice.date', 'Invoice.id'],
            raw: true,
            include: [
                {
                    model: InvoiceItem,
                    required: true,
                    attributes: [
                        'itemId',
                        [Sequelize.fn('sum', Sequelize.col('quantity')), 'quantity'],
                        [Sequelize.fn('sum', Sequelize.col('finance_final_vp')), 'financeFinalVP'],
                        [Sequelize.fn('sum', Sequelize.col('tax_finance')), 'taxFinance']
                    ],
                    where: {
                        itemId: itemId
                    },
                }
            ],
        })

        const [result, invoices] = await Promise.all([res, inv])

        const sale = result.map(item => {
            return {
                date: item.date,
                quantity: item.quantity || 0,
                financeVP: item.financeFinalVP || 0,
                taxFinance: item.taxFinance || 0
            } as any
        })
        const _inv = invoices.map((inv: any) => {
            return {
                date: inv.date,
                quantity: _get(inv, 'items.quantity', 0),
                financeVP: _get(inv, 'items.financeFinalVP', 0),
                taxFinance: _get(inv, 'items.taxFinance', 0),
            }
        })

        return sale.reduce((acc: any, x: any) => {
            const i = _inv.find(inv => inv.date === x.date)
            if (i) {
                const obj = {
                    ...x,
                    quantity: _round(_add(x.quantity, i.quantity), 2),
                    financeVP: _round(_add(x.financeVP, i.financeVP), 2),
                    taxFinance: _round(_add(x.taxFinance, i.taxFinance), 2),
                }
                return [
                    ...acc,
                    obj
                ]
            }

            return [
                ...acc,
                x
            ]
        }, [])
    }

    public static async totalTransactionByItem (ctx: IContextApp, itemId: number, dateStart?: Date, dateEnd?: Date): Promise<TransactionItemSummarize> {
        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        const res = ReceiptItem.findOne({
            where: {
                itemId: itemId,
                clientId: ctx.clientId,
                date: {
                    [Sequelize.Op.and]: {
                        [Sequelize.Op.gte]: dateStart,
                        [Sequelize.Op.lte]: dateEnd
                    },
                },
            },
            attributes: [
                [Sequelize.fn('sum', Sequelize.col('quantity')), 'quantity'],
                [Sequelize.fn('sum', Sequelize.col('finance_final_vp')), 'financeFinalVP'],
                [Sequelize.fn('sum', Sequelize.col('tax_finance')), 'taxFinance']
            ]
        })

        const [result, item] = await Promise.all([res, Item.findByPk(itemId)])
        return {
            item,
            quantity: result.quantity || 0,
            financeVP: result.financeFinalVP || 0,
            taxFinance: result.taxFinance || 0
        }
    }

    public static async totalTransactionBetweenDatesByItem (ctx: IContextApp, itemId: number, dateStart?: Date, dateEnd?: Date): Promise<TransactionItemSummarize[]> {
        if (!dateStart) {
            dateStart = new Date(2000, 1, 1)
        }

        if (!dateEnd) {
            dateEnd = new Date()
            dateEnd.setDate(dateEnd.getDate() + 1)
        }

        if (isAfter(dateEnd, new Date())) {
            dateEnd = endOfToday()
        }

        const limit = differenceInCalendarDays(dateEnd, dateStart)
        return Item.getSalesByItem(itemId, ctx, dateStart, dateEnd)
    }

    public static async totalSaleItemsByYear (ctx: IContextApp, itemId: number): Promise<TransactionItemSummarize[]> {

        const currentDate = new Date()
        const promises = []
        const invoicesProms = []
        for (let i = 0; i < 12; i++) {
            const date = new Date(`${currentDate.getFullYear().toString()}-${i + 1}`)
            const startDate = startOfMonth(date)
            const endDate = endOfMonth(date)
            promises.push(ReceiptItem.findOne({
                where: {
                    itemId: itemId,
                    clientId: ctx.clientId,
                    date: {
                        [Sequelize.Op.and]: {
                            [Sequelize.Op.gte]: startDate,
                            [Sequelize.Op.lte]: endDate
                        },
                    },
                },
                attributes: [
                    [Sequelize.fn('sum', Sequelize.col('quantity')), 'quantity'],
                    [Sequelize.fn('sum', Sequelize.col('finance_final_vp')), 'financeFinalVP'],
                    [Sequelize.fn('sum', Sequelize.col('tax_finance')), 'taxFinance'],
                ],
            }))
        }

        for (let i = 0; i < 12; i++) {
            const date = new Date(`${currentDate.getFullYear().toString()}-${i + 1}`)
            const startDate = startOfMonth(date)
            const endDate = endOfMonth(date)
            invoicesProms.push(Invoice.findAll({
                where: {
                    clientId: ctx.clientId,
                    date: {
                        [Sequelize.Op.and]: {
                            [Sequelize.Op.gte]: startDate,
                            [Sequelize.Op.lte]: endDate
                        },
                    },
                    status: CONSTANT_MODEL.INVOICE_STATUS.SAVED
                },
                attributes: ['id', 'date'],
                group: ['Invoice.date', 'Invoice.id'],
                raw: true,
                include: [
                    {
                        model: InvoiceItem,
                        required: true,
                        attributes: [
                            'itemId',
                            [Sequelize.fn('sum', Sequelize.col('quantity')), 'quantity'],
                            [Sequelize.fn('sum', Sequelize.col('finance_final_vp')), 'financeFinalVP'],
                            [Sequelize.fn('sum', Sequelize.col('tax_finance')), 'taxFinance']
                        ],
                        where: {
                            itemId: itemId
                        },
                    }
                ],
            }))
        }

        const result = await Promise.all(promises)

        /* return result.reduce((acc: any,item: any,index: number) => {
            return [
                ...acc,
                item
            ]
        },[])*/

        return result.map((item, index: number) => {
            const date = format(new Date().setMonth(index), 'MMMM')
            return item ? {
                date: date,
                quantity: item.quantity || 0,
                financeVP: item.financeFinalVP || 0,
                taxFinance: item.taxFinance || 0
            } as any : {
                date,
                quantity: 0,
                financeVP: 0,
                taxFinance: 0
            }
        })
    }

    public static async getImagesFromDrive (data): Promise<any> {
        await fixItemsDataBase(data)
    }

}

const BaseResolver = createBaseResolver(Item, {
    updateInputType: ItemType,
    insertInputType: ItemType
})

@Resolver()
export class ItemResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, {name: 'insertItems'})
    _qModelInsertBulk (@Arg('data', type => [ItemType]) data: ItemType[],
        @Ctx() ctx: IContextApp) {
        return Item.insertBulk(data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, {name: 'testInsertItemsByClient'})
    async _qModelInsertBulkItemsByClient (@Arg('data', type => [ItemType]) data: ItemType[],
        @Ctx() ctx: IContextApp) {
        if (!config.TEST) {
            throw Error('This mutation can be only called in test mode.')
        }
        const clients = []
        for (let i = 1; i < 11; i++) {
            clients.push(i + 1)
        }
        const promises = clients.map((x, i) => {
            return Item.insertBulk(data, {
                clientId: x
            } as any)
        })
        await Promise.all(promises)
        return 'OK'
    }

    @UseMiddleware(checkJWT)
    @Query(returns => TransactionItemSummarize, {nullable: true, name: 'totalSaleTransactionByItem'})
    _totalSaleTransactionByItem (@Arg('itemId', type => Int) itemId: number,
        @Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Item.totalTransactionByItem(ctx, itemId, dateStart, dateEnd)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [TransactionItemSummarize], {nullable: true, name: 'totalTransactionBetweenDatesByItem'})
    _totalSaleTransactionBetweenDatesByItem (@Arg('itemId', type => Int) itemId: number,
        @Arg('dateStart', type => Date, {nullable: true}) dateStart: Date,
        @Arg('dateEnd', type => Date, {nullable: true}) dateEnd: Date,
        @Ctx() ctx: IContextApp) {
        return Item.totalTransactionBetweenDatesByItem(ctx, itemId, dateStart, dateEnd)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => [TransactionItemSummarize], {nullable: true, name: 'totalSaleItemsByYear'})
    _totalSaleItemsByYear (@Arg('itemId', type => Int) itemId: number,
        @Ctx() ctx: IContextApp) {
        return Item.totalSaleItemsByYear(ctx, itemId)
    }

    @Mutation(returns => [Item], {nullable: true, name: 'testFixItemsImages'})
    _testFixItemsImages (@Arg('data',type => ItemImageType) data: ItemImageType,
        @Ctx() ctx: IContextApp) {
        if (!config.TEST) {
            throw Error('This mutation can be only called in test mode.')
        }
        return Item.getImagesFromDrive(data)
    }

}

