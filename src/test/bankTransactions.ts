import 'reflect-metadata'
import 'jest-extended'
import {
    addDays,
    differenceInCalendarDays
}                             from 'date-fns'
import BankHeaderTransactions from '../sequelize/models/BankHeaderTransactions.model'
import BankAccount            from '../sequelize/models/BankAccount.model'
import Customer               from '../sequelize/models/Customer.model'
import _                      from 'lodash'
import BankTransactions       from '../sequelize/models/BankTransactions.model'

const generateBankTransactionByHeader = async (bankHeaderTransaction: BankHeaderTransactions, options: any, count: number = 10,) => {

    const bankAccount = await BankAccount.findAll({
        offset: 5,
        limit: _.random(5,50),
        include: [
            {
                model: Customer
            }
        ],
    })

    const transactionArray = []
    const customerArray = []
    for (let i = 0; i < count; i++) {
        const bank = bankAccount[_.random(0, bankAccount.length - 1)]
        const value = _.random(1, 1000, true)
        const isOwes = _.random(0, 1)
        transactionArray.push(Object.assign({
            bankHeaderTransactionId: bankHeaderTransaction.id,
            bankAccountId: Number(bank.id),
            customerId: Number(bank.customerId),
            expenses: _.random(0, 50),
            datePaid: bankHeaderTransaction.dateProcessed,
            dateProcessed: bankHeaderTransaction.dateProcessed,
            clientId: 1
        },  isOwes ? {financeOwes: value} : {financeClaims: value}))
        customerArray.push({
            customerId:bank.customerId,
            paidFrom: isOwes ? value : 0,
            paidTo: !isOwes ? value : 0
        })
    }

    const transactions =  await BankTransactions.bulkCreate(transactionArray, options)
    return [transactions,customerArray]
}

export const createBankTransactions = async (date: Date) => {
    let headerBankTransaction
    let currentDate = date
    const count = differenceInCalendarDays(new Date(), currentDate)

    const transaction = await BankHeaderTransactions.sequelize.transaction()
    if (!transaction) {
        throw Error('Transaction can\'t be open')
    }
    const options = {transaction}
    try { 
        const bankHeaderTrans = await BankHeaderTransactions.findAll()

        if (bankHeaderTrans.length < 200) {
            for (let i = 0; i < count; i++) {
                headerBankTransaction = await BankHeaderTransactions.create({
                    bankAccountId: 1,
                    dateProcessed: currentDate.toISOString(),
                    description: 'some description',
                    documentId: `${i + 1}`,
                    clientId: 1
                }, options)
                const transData = await generateBankTransactionByHeader(headerBankTransaction, options)
                const [transactions,customers] = transData
                const financeClaims = await transactions.reduce((acc: number, trans) => _.round(_.add(acc, trans.financeClaims), 2), 0)
                const financeOwes = await transactions.reduce((acc: number, trans) => _.round(_.add(acc, trans.financeOwes), 2), 0)
                await headerBankTransaction.update({financeClaims, financeOwes}, options)
                const promise = await customers.map(async (x) => {
                    const customer = await Customer.findOne({where: {id: x.customerId},...options})
                    const paidFrom = _.round(_.add(customer.paidFrom,x.paidFrom),2)
                    const paidTo = _.round(_.add(customer.paidTo,x.paidTo),2)
                    return customer.update({ paidFrom, paidTo},options)
                })
                await Promise.all(promise)
                currentDate = addDays(currentDate, 1)
            }
        }
        await transaction.commit()
    } catch (e) {
        transaction.rollback()
        throw e
    }
}

