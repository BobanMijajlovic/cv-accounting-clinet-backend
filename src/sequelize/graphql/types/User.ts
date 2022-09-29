import {
    Field,
    InputType
}                        from 'type-graphql'
import {IsNoBlankInWord} from '../validations'
import {
    IsEmail,
    Length
}                        from 'class-validator'
import {GraphQLUpload}   from 'apollo-server-express'
import {UploadType}      from './Client'

@InputType({isAbstract: true})
export class UserType {

    @Field({nullable: true})
    @IsNoBlankInWord({message: 'First name must be with out blanks'})
    firstName: string

    @Field({nullable: true})
    @IsNoBlankInWord({message: 'Last name must be with out blanks'})
    @Field()
    lastName: string

    @Field({nullable: true})
    @Length(4, 63)
    @IsNoBlankInWord({message: 'User Name must be with out blanks'})
    userName: string

    @Field({nullable: true})
    @Length(1, 63)
    @IsEmail()
    email: string

    @Field({nullable: true})
    @Length(4, 63)
    password: string

    @Field({nullable: true})
    @Length(4, 4)
    pinCode: string

    @Field(type => GraphQLUpload,{nullable:true})
    image: UploadType
}

@InputType({isAbstract: true})
export class UserChangePasswordType {
    @Field()
    @Length(4, 63)
    password: string

    @Field()
    @Length(4, 63)
    currentPassword: string
}

@InputType({isAbstract: true})
export class UserChangePinType {
    @Field()
    @Length(4, 63)
    pin: string

    @Field()
    @Length(4, 63)
    currentPin: string
}

@InputType({isAbstract: true})
export class ChangePasswordLinkType {
    @Field()
    @Length(4, 63)
    password: string

    @Field()
    key: string
}

