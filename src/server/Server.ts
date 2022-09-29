import axios              from 'axios'
import {
    ServerActions,
    SeverModels,
    TServerProps
}                         from './d'
import CONFIG             from '../config'
import Bank               from '../sequelize/models/Bank.model'
import {
    Customer,
    Translate
} from '../sequelize/models'
import CurrencyDefinition from '../sequelize/models/CurrencyDefinition.model'
import CurrencyValue      from '../sequelize/models/CurrencyValue.model'
import _, {omit as _omit} from 'lodash'

type TResponseData = {
    headers: Record<string, unknown>,
    body: Record<string, unknown>,
    statusCode: string | number

}

export const _request = (props: TServerProps): Promise<{ response: TResponseData }> => {

    const {url} = CONFIG.serverHWT || {}
    return new Promise((resolve, reject) => {
        axios({
            method: 'POST',
            url,
            data: {...props},
            timeout: 10000,
            responseType: 'json'
        }).then((response) => {
            resolve({
                response: {
                    headers: response.headers,
                    body: response.data,
                    statusCode: response.status,
                },
            })
        })
            .catch((error) => {
                if (error.response) {
                    reject(error.response.data)
                } else {
                    reject(error)
                }
            })
    })
}

export const getCustomerByName = async (value: string) => {
    const data = await _request({
        model: SeverModels.Customer,
        action: ServerActions.getByName,
        value: value
    })
    if (!data?.response?.body || !Array.isArray(data.response.body)) {
        return []
    }
    return data.response.body
}

export const getCustomerByTin = async (value: string) => {
    const data = await _request({
        model: SeverModels.Customer,
        action: ServerActions.getByTaxId,
        value: value
    })
    if (!data?.response?.body) {
        return {}
    }
    return data.response.body
}

export const getCustomerByBankAccount = async (value: string) => {
    const data = await _request({
        model: SeverModels.Customer,
        action: ServerActions.getByBankAccount,
        value: value
    })
    if (!data?.response?.body) {
        return {}
    }
    return data.response.body
}

export const getBank = async () => {

    try {
        const data = await _request({
            model: SeverModels.Bank,
            action: ServerActions.getAll
        })
        if (!data?.response || !data?.response?.body || !Array.isArray(data?.response?.body)) {
            return []
        }
        const {body: banks} = data.response
        const array = banks.map(m => Bank.findByPk(m.id).then(v => {
            if (!v) {
                return Bank.create({
                    ...m
                })
            }
            if (v.bankName !== m.bankName) {
                return v.update({bankName: m.bankName})
            }
        }))
        return Promise.all(array)
    } catch (e) {
        console.log('error ', e)
    }
}

export const getTranslate = async () => {

    const fields = Object.keys(Translate.rawAttributes).filter(x => !['id', 'key', 'createdAt', 'updatedAt'].includes(x))

    try {
        const data = await _request({
            model: SeverModels.Translate,
            action: ServerActions.getAll
        })
        if (!data?.response || !data?.response?.body || !Array.isArray(data?.response?.body)) {
            return
        }
        const {body: translates} = data.response
        const array = translates.map(t => Translate.findOne({
            where: {
                key: t.key
            }
        }).then(v => {
            if (!v) {
                return Translate.create({
                    ...t
                })
            }
            const isSame = fields.every(g => t[g] === v[g])
            if (!isSame) {
                return v.update(t)
            }
        }))
        return Promise.all(array)
    } catch (e) {
        console.log('error ', e)
    }
}

export const getTranslateByLanguage = async () => {
    const fields = Object.keys(Translate.rawAttributes).filter(x => !['id', 'key', 'createdAt', 'updatedAt'].includes(x))
    const data = await _request({
        model: SeverModels.Translate,
        action: ServerActions.getAll,
    })
    if (!data?.response || !data?.response?.body || !Array.isArray(data?.response?.body)) {
        return
    }
    const {body: translateData} = data.response

    const transaction = await CurrencyValue.sequelize.transaction()
    if (!transaction) {
        throw Error('Transaction can\'t be open')
    }
    const options = {transaction, validate: true}
    try {
        const promises = translateData.map(translate => Translate.findOne({
            where: {
                key: translate.key
            },
            ...options
        })
            .then((t) => {
                if (!t) {
                    return Translate.create(translate, options)
                }
                const isSame = fields.every(g => t[g] === translate[g])
                if (!isSame) {
                    return t.update({..._omit(translate, ['key'])}, options)
                }
            }))
        await Promise.all(promises)
        await transaction.commit()
    } catch (e) {
        transaction.rollback()
        throw (e)
    }
}

export const getCurrencyList = async (date: string) => {

    const data = await _request({
        model: SeverModels.CurrencyValue,
        action: ServerActions.getCurrencyList,
        value: date
    })

    if (!data?.response || !data?.response?.body || !Array.isArray(data?.response?.body)) {
        return
    }

    const {body: currencyValues} = data.response

    const transaction = await CurrencyValue.sequelize.transaction()
    if (!transaction) {
        throw Error('Transaction can\'t be open')
    }
    const options = {transaction, validate: true}
    try {
        const definitionsCurrent = await CurrencyDefinition.findAll({...options})
        const notInBase = currencyValues.filter((p: CurrencyValue) => !definitionsCurrent.find(d => d.id === p.currencyDefinitionId))
            .map((c: CurrencyValue) => CurrencyDefinition.create({...c.currencyDefinition}, options));
        (notInBase.length > 0) && await Promise.all(notInBase)

        const records = currencyValues.map((c: CurrencyValue) => CurrencyValue.findByPk(c.id, options)
            .then((v) => {
                if (!v) {
                    return CurrencyValue.create(_.pick(c, ['date', 'dateTo', 'dateCreated', 'unit', 'buyingRate', 'middleRate', 'sellingRate', 'currencyDefinitionId']), options)
                }
                return v.update(_.pick(c, ['date', 'dateTo', 'dateCreated', 'unit', 'buyingRate', 'middleRate', 'sellingRate', 'currencyDefinitionId']), options)
            }))
        await Promise.all(records)
        await transaction.commit()
        return CurrencyValue.getValuesByDate(new Date(date))
    } catch (e) {
        transaction.rollback()
        throw (e)
    }
}
