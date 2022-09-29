import {
    Field,
    InputType,
    ObjectType
}               from 'type-graphql'
import {Length} from 'class-validator'
import {
    IsNoBlankInWord,
    IsPasswordValid
}               from '../validations'
import {User}   from '../../models'

@ObjectType('AuthLoginTokens')
export class LoginResponse {
    @Field(type => String)
    token: string

    @Field(type => String)
    refresh: string

    @Field(type => User)
    user: User
}

@InputType('AuthUserChangePassword')
export class AuthChangePassword {
    @Field()
    @Length(4, 63)
    @IsPasswordValid({message: 'Password is not valid'})
    password: string

    @Field()
    key: string
}

@InputType('AuthUserLogin')
export class AuthUserLogin {
    @Length(3, 63)
    @Field({nullable: true})
    accountCode: string

    @Field()
    @Length(1, 63)
    userName: string

    @Field()
    password: string
}

@InputType('AuthUnlock')
export class AuthUnlock {
    @Length(4, 4)
    @Field({nullable: true})
    pinCode: string
}

@InputType('AuthUserRegister')
export class AuthUserRegister {
    @Length(3, 63)
    @Field({nullable: true})
    accountCode: string

    @Length(4, 63)
    @IsNoBlankInWord({message: 'User Name must be with out blanks'})
    @Field()
    userName: string

    @Field()
    @Length(1, 63)
    email: string

    @Field()
    @Length(4, 63)
    @IsPasswordValid({message: 'Password is not valid'})
    password: string
}
