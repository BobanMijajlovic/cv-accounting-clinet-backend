import {
    Field,
    InputType
} from 'type-graphql'
import * as GraphQLJSON from 'graphql-type-json'

@InputType({isAbstract: true})
export class ApplicationDataType {
    @Field({nullable:true})
    key: string

    @Field({nullable:true})
    value: string

    @Field(type => GraphQLJSON.default, {nullable: true})
    valueJSON: object

    @Field({nullable: true})
    status: number

}
