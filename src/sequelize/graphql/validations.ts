import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions
}                from 'class-validator'
import Sequelize from 'sequelize'
import {
    Model,
    ModelCtor
}                from 'sequelize-typescript'

export function IsNoBlankInWord (validationOptions?: ValidationOptions) {
    return function(object: Record<string, any>, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: {
                async validate (input: string) {
                    return input.length === 0 ? true : (/\s+/.exec(input) ? false : true)
                }
            }
        })
    }
}

export function IsPasswordValid (validationOptions?: ValidationOptions) {
    return function(object: Record<string, any>, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: {
                async validate (input: string) {
                    if ((/\s+/.exec(input)) || !(/\d+/.exec(input)) || !/[A-Z]/.exec(input) || !/[a-z]/.exec(input)) {
                        return false
                    } /** can't have blank , must have at least one number , must have at least one upperCase char*/
                    return true
                }
            }
        })
    }
}

/** Validator to check is email is unique in table */
export function IsEmailUnique<T extends Model> (ModelSeq: ModelCtor<T>, validationOptions?: ValidationOptions) {
    return function(object: Record<string, any>, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: {
                async validate (email: string, args: ValidationArguments) {
                    const modelObject: any = args.object
                    if (modelObject.id) { /** then it is update action and same email has to be accepted */
                        return (await ModelSeq.findOne({
                            where: {
                                email: email,
                                id: {
                                    [Sequelize.Op.ne]: modelObject.id
                                }
                            }
                        })) ? false : true
                    }
                    return (await ModelSeq.findOne({where: {email}})) ? false : true
                }
            }
        })
    }
}

export function isDateValid (validationOptions?: ValidationOptions) {
    return function(object: Record<string, any>, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: {
                validate (input: Date) {
                    const date = new Date(input)
                    return !isNaN(date.getTime())
                }
            }
        })
    }
}

