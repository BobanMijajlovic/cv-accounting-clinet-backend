import {
    Field,
    InputType,
    ObjectType
}                         from 'type-graphql'
import {AddressType}      from './Address'
import {Length}           from 'class-validator'
import {BankAccountType}  from './BankAccount'
import {Stream}           from 'stream'
import {ContactType}      from './Contact'
import {CustomerInfoType} from './Customer'
import Client             from '../../models/Client.model'
import BankAccount        from '../../models/BankAccount.model'

@InputType({isAbstract: true})
export class ClientType {
    @Field({nullable: true})
    @Length(1, 16)
    accountCode: string

    @Field({nullable: true})
    shortName: string
    @Field({nullable: true})
    fullName: string

    @Field({nullable: true})
    taxNumber: string

    @Field({nullable: true})
    uniqueCompanyNumber: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    status: number

    @Field(type => [AddressType!], {nullable: true})
    addresses: AddressType[]

    @Field(type => [BankAccountType!], {nullable: true})
    banks: BankAccountType[]
    
    @Field(type => [ContactType!], {nullable: true})
    contacts: ContactType[]

    @Field(type => [CustomerInfoType!], {nullable: true})
    infos: CustomerInfoType[]
}

@InputType({isAbstract: true})
export class SettingsType {
    @Field({nullable: true})
    name: string

    @Field({nullable: true})
    value: string

    @Field({nullable: true})
    status: number
}

export type UploadType = {
    filename: string
    mimetype: string
    encoding: string
    createReadStream: ()=> Stream
}

@ObjectType({isAbstract: true})
export class UploadedFileResponseType {
    @Field()
    url: string
}
