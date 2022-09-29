import Client   from '../sequelize/models/Client.model'
import {
    Address,
    Customer,
    User,
    Warehouse
}               from '../sequelize/models'
import bcrypt   from 'bcryptjs'
import Tax      from '../sequelize/models/Tax.model'
import TaxValue from '../sequelize/models/TaxValue.model'

import configuration  from '../config'
import {
    CONSTANT_ADDRESS_TYPES,
    CONSTANT_MODEL,
    SETTINGS
}                             from '../sequelize/constants'
import Settings               from '../sequelize/models/Settings.model'
import _                      from 'lodash'
import BankAccount            from '../sequelize/models/BankAccount.model'
import {
    ServerActions,
    SeverModels
}                             from '../server/d'
import {_request}             from '../server/Server'
import {CustomerType}         from '../sequelize/graphql/types/Customer'

export const createTestData = async () => {

    /** This part should be out of test - KEEP in production too */

    let settings = await Settings.findOne({
        where: {
            key: SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL
        }
    })

    if (!settings) {
        const object = {
            service: 'gmail',
            auth: {
                user: 'dealsellapp@gmail.com',
                pass: 'boban2003hwt'
            }
        }
        Settings.create({
            key: SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL,
            status: CONSTANT_MODEL.STATUS.ACTIVE,
            value: JSON.stringify(object)
        })
    }

    settings = await Settings.findOne({
        where: {
            key: SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL_TEXT
        }
    })
    if (!settings) {
        const data = '<p>Deal POS<p>Please confirm your request by clicking on <a href=LINK_TO_REPLACE>active</a></p></p>'
        await Settings.create({
            key: SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL_TEXT,
            status: CONSTANT_MODEL.STATUS.ACTIVE,
            value: JSON.parse(JSON.stringify(data))
        })
    }

    let client = await Client.findByPk(1)
    if (!client) {
        client = await Client.create({
            accountCode: 'test',
            shortName: 'Test Client',
            fullName: 'Test Client full name',
            taxNumber: '123456789',
            uniqueCompanyNumber: '987654',
            description: 'some description - test client',
        })
        await Address.create({
            street: 'Jasicki put 9A',
            zipCode: '37000',
            city: 'Krusevac',
            state: 'Serbia',
            clientId: client.id,
            type: CONSTANT_ADDRESS_TYPES.HEADQUARTERS
        })
        await BankAccount.create({
            account: '265 12345678 70',
            accountString: '2651234567870',
            bankId: 265,
            clientId: client.id
        })
        await BankAccount.create({
            account: '330 87654321 70',
            accountString: '3308765432170',
            bankId: 330,
            clientId: client.id
        })
    }

    settings = await Settings.findOne({
        where: {
            key: SETTINGS.KEY_APPLICATION_SETTINGS,
            clientId: 1
        }
    })
    if (!settings) {
        const object = {
            settingsLabels: {
                total: 'Total',
                subTotal: 'Sub',
                change: 'Change'
            },
            currencySettings: {
                currency: 'RSD',
                minCurrency: 1,
                maxCurrency: 5000
            },
            sellingBoard: {
                itemsPerRow: 6,
                totalRow: 4
            },
            settingsDateFormat: {
                local: 'en-US',
                useHours24: true,
                showDate: true,
                showTime: false,
                timeFormatSS: false,
                fullYearFormat: false
            },
            itemsSettings: {
                showImage: true,
                isGrid: true
            },
            payingOptions: [
                {
                    label: 'CASH',
                    icon: 'fa-money-bill',
                    color: '#43A047',
                    isActive: true
                },
                {
                    label: 'CARD',
                    icon: 'fa-cc-visa',
                    color: '#C62828',
                    isActive: true
                },
                {
                    label: 'CHECK',
                    icon: 'fa-money-check-alt',
                    color: '#006064',
                    isActive: true
                }
            ],
            cardTypes: [
                {
                    icon: 'fa-cc-mastercard',
                    value: 0
                },
                {
                    icon: 'fa-cc-visa',
                    value: 1
                },
                {
                    icon: 'fa-cc-amex',
                    value: 2
                }
            ]
        }
        Settings.create({
            key: SETTINGS.KEY_APPLICATION_SETTINGS,
            status: CONSTANT_MODEL.STATUS.ACTIVE,
            value: JSON.stringify(object),
            clientId: 1,
        })
    }

    let user = await User.findByPk(2)
    await user.update({
        password: await bcrypt.hash('Test123!', 12),
    })
    if (!user) {
        user = await User.create({
            email: 'boban.mijajlovic.rs@gmail.com',
            firstName: 'Boban',
            lastName: 'Mijajlovic',
            userName: 'bobi123',
            clientId: 1,
            password: await bcrypt.hash('test123!', 12),
            pinCode: '1111'
        })

    }

    const taxRecordKey = 'def-init-values'
    const date = new Date()
    for (let i = 1; i < 6; i++) {
        const tax = await Tax.findByPk(i)
        if (!tax) {
            await Tax.create({
                name: `Tax ${String.fromCharCode(i + 64)}`,
                short: `Tax ${String.fromCharCode(i + 64)}`,
                mark: String.fromCharCode(i + 64),
                uniqueKey: i,
                value: i === 1 || i === 2 ? 10 * i : 10 + i,
                clientId: 1,
            })
        }
        const taxv = await TaxValue.findOne({
            where: {
                taxId: i,
                clientId: 1,
                recordKey: taxRecordKey
            }
        })

        if (!taxv) {
            await TaxValue.create({
                taxId: i,
                clientId: 1,
                date: date,
                recordKey: taxRecordKey,
                value: i === 1 || i === 2 ? 10 * i : 10 + i
            })
        }
    }

    /** DATA FOR TEST ONLY */

    let warehouse = await Warehouse.findByPk(1)
    if (configuration.TEST && !warehouse) {
        warehouse = await Warehouse.create({
            name: 'Warehouse 1',
            description: 'test description',
            clientId: 1
        })
    }

    const clients = await Client.findAndCountAll()

    if (configuration.TEST && clients.count <= 1) {
        const rndPos = _.random(1, 50) * 2000
        const rnd = _.random(10, 100) * 10000
        const clients = []
        for (let i = 0; i < 10; i++) {
            clients.push({
                accountCode: `test-${i + 1}`,
                shortName: `Test Client - ${i + 1}`,
                fullName: `Test Client full name - ${i + 1}`,
                description: `some description - test client ${i + 1}`,
                uniqueCompanyNumber: `${rnd + rndPos + i}`,
                taxNumber: `${rnd + rndPos + i}`
            })
        }
        try {
            const _clients = await Client.bulkCreate(clients)
            const pass = await bcrypt.hash('user123', 12)
            const users = _clients.map((client, index) => {
                const arr = []
                for (let j = 0; j < 10; j++) {
                    const user = `user${(10 * index) + j + 1}`
                    arr.push({
                        firstName: `Test name- ${j + 1}`,
                        lastName: `Test last name- ${j + 1}`,
                        userName: user,
                        password: pass,
                        clientId: client.id
                    } as User)
                }
                return User.bulkCreate(arr)
            })
            await Promise.all(users)
        } catch (e) {
            console.log(e)
        }
    }

    const customers = await Customer.findAll()
    if (configuration.TEST && customers.length === 0) {
        const data = await _request({
            model: SeverModels.Customer,
            action: ServerActions.getCustomerTest
        })
        if (!data?.response || !data?.response?.body || !Array.isArray(data?.response?.body)) {
            return
        }

        const {body: customers} = data.response
        const _customers = customers.map(x => {
            return {
                ..._.omit(x,['id','createdAt','updatedAt']),
                banks: x.banks.map(b => {
                    return {
                        ..._.omit(b,['id','createdAt','updatedAt','customerId']),
                        clientId: client.id
                    }
                }),
                addresses: x.addresses.map(a => {
                    return {
                        ..._.omit(a,['id','createdAt','updatedAt','customerId']),
                        clientId: client.id
                    }
                })
            } as CustomerType
        })
        await Customer.insertBulk(_customers,{clientId: Number(client.id)} as any)
    }

    /* const sellingPanels = await SellingPanel.findAll()
    let sellingPanel = sellingPanels.length ? sellingPanels[0] : null
    if (configuration.TEST && sellingPanels.length === 0) {
        sellingPanel = await SellingPanel.create({
            name: 'Drinks',
            icon: 'fa-cogs',
            color: '#546E7A'
        })
    }

    const activePanels = await SellingPanelVisibility.findAll()
    if (configuration.TEST && activePanels.length === 0) {
        await SellingPanelVisibility.create({
            sellingPanelId: sellingPanel.id,
            clientId: 1
        })
    }*/

    /** END  */

}
