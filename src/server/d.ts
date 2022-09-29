export enum SeverModels {
    Customer = 'Customer',
    Bank = 'Bank',
    Translate = 'Translate',
    CurrencyValue = 'CurrencyValue'

}

export enum ServerActions {
    getByTaxId = 'getByTaxId',
    getAll = 'getAll',
    getCurrencyList = 'getCurrencyList',
    getTranslate = 'getTranslate',
    getByName = 'getByName',
    getByBankAccount= 'getByBankAccount',
    getCustomerTest='getCustomerTest'
}

export type TServerProps = {
    model: SeverModels,
    action: ServerActions,
    value?: string,
    force?: boolean
}
