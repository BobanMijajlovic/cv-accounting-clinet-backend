import {
    Field,
    InputType
} from 'type-graphql'

@InputType({isAbstract: true})
export class ReceiptTemplateType {
    @Field({nullable: true})
    name: string

    @Field({nullable: true})
    value: string

    @Field({nullable: true})
    status: number
}
