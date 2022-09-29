import Timeout = NodeJS.Timeout
import Email      from '../sequelize/models/Email.model'
import Settings   from '../sequelize/models/Settings.model'
import nodemailer from 'nodemailer'
import * as Mail  from 'nodemailer/lib/mailer'
import {
    CONSTANT_MODEL,
    SETTINGS
}                 from '../sequelize/constants'

const IDLE_TIME = 10 * 1000 // 10*60* 1000 ///* 10 mins
const YEALD_TIME = 3 * 1000 // /* 10 mins

class EmailManager {
    private timer: Timeout
    private lock: boolean

    constructor () { }

    setTimerInterval (interval: number) {
        this.timer && clearInterval(this.timer)
        const fn = this.run.bind(this)
        //@ts-ignore
        this.timer = setInterval(fn, interval)
    }

    notify () {
        this.timer.refresh()
    }

    async sendEmail (email: Email, sender: string, transport: Mail) {

        email = await email.update({
            numTryToSend: email.numTryToSend + 1
        })

        const data = email.body.replace(/^\s*"\s*(.*)\s*"\s*$/, '$1')

        const mailOptions = {
            from: sender,
            to: email.to,
            subject: email.subject,
            html: `<p>${data}</p>`
        }

        try {
            await transport.sendMail(mailOptions)
        } catch (e) {
            return
        }

        await email.update({
            status: CONSTANT_MODEL.EMAIL_STATUS.SENT
        })
    }

    async process () {
        const settings: Settings = await Settings.findOne({
            where: {
                key: SETTINGS.KEY_APPLICATION_CONFIRM_EMAIL
            }
        }) as Settings

        if (!settings) {
            this.setTimerInterval(IDLE_TIME)
            return
        }

        let emailSettings = {} as any
        try {
            emailSettings = JSON.parse(settings.value)
        } catch (e) {
            this.setTimerInterval(IDLE_TIME)
            return
        }
        if (!emailSettings?.auth?.user) {
            this.setTimerInterval(IDLE_TIME)
            return
        }

        let smtpTransport = void(0)
        try {
            smtpTransport = await nodemailer.createTransport(emailSettings)
        } catch (e) {
            this.setTimerInterval(IDLE_TIME)
            return
        }

        const email = await Email.getNotSent()
        if (!email) {
            this.setTimerInterval(IDLE_TIME)
            return
        }
        await this.sendEmail(email, emailSettings?.auth?.user, smtpTransport)
        this.setTimerInterval(YEALD_TIME)
    }

    async run () {
        this.lock = true
        await this.process()
        this.lock = false
    }
}

export const instance = new EmailManager()

