import {createBankTransactions} from '../../test/bankTransactions'

describe('Bank transaction test',  () => {
    it('Insert transactions', async (done) => {
        await createBankTransactions(new Date('2020-01-01'))
        done()
    })
})
