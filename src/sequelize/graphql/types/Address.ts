import {
    Field,
    InputType
} from 'type-graphql'

@InputType({isAbstract: true})
export class AddressType {

    @Field({nullable: true})
    street: string

    @Field({nullable: true})
    zipCode: string

    @Field({nullable: true})
    city: string

    @Field({nullable: true})
    state: string

    @Field({nullable: true})
    description: string

    @Field({nullable: true})
    type: string

    @Field({nullable: true})
    status: number
}

