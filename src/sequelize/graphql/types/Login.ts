import {
    Field,
    InputType, ObjectType
} from 'type-graphql'
import {
    IsEmailUnique,
    IsNoBlankInWord,
    IsPasswordValid
}             from '../validations'
import {
    IsEmail,
    Length
}             from 'class-validator'

@InputType({isAbstract: true})
export class LoginType {

    @Field({nullable: true})
    @Length(1,16)
    @IsNoBlankInWord({message: 'Account code must be with out blanks'})
    accountCode: string

    @Field({nullable:true})
    @IsNoBlankInWord({message: 'User Name must be with out blanks'})
    userName: string

    @Field({nullable:true})
    @IsNoBlankInWord({message: 'Email must be with out blanks'})
    /* @IsEmailUnique(User, {message: 'Email already in use'})*/
    email: string

    @Field()
    @Length(4, 63)
    // @IsPasswordValid({message: 'Password is not valid'})
    password: string

    @Field()
    @Length(4, 4)
        // @IsPasswordValid({message: 'Password is not valid'})
    pinCode: string

}

@ObjectType('loginTokens')
export class LoginResponseType  {

    @Field(type => String)
    token: string

    @Field(type => String)
    refresh: string

    @Field(type => String)
    refreshTime: string
}
