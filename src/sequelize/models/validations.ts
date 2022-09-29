export enum modelSTATUS {
    DELETED = 0,
    ACTIVE = 1,
    NOT_ACTIVE = 2
}

export const isStatusValid = (model: string, value) => {

    const message = ` ${model}.status is not valid   `

    switch (value) {
        default:
            throw Error(message)
        case modelSTATUS.ACTIVE:
        case modelSTATUS.DELETED:
        case modelSTATUS.NOT_ACTIVE:
            return
    }
}

export const checkValidationByEnum = (data: any, message: string, value) => {
    if (!(value in data)) {
        throw Error(message)
    }
    return true
}

export const checkTrimString = (model: string, field: string, message: string, value: string) => {
    if (!value) {
        return true
    }
    if (value.length !== value.trim().length) {
        throw (message ? message : `${field} can't have white space around`)
    }
    return true
}

export const notNullMessage = (field: string) => `${field} can't be null`

