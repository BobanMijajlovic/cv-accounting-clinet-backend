import {
    Field,
    InputType
} from 'type-graphql'

@InputType({isAbstract: true})
export class ContactType {

    @Field({nullable: true})
    type: string

    @Field({nullable: true})
    value: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    status: number
}
