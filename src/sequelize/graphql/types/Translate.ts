import {
    Field,
    ObjectType
} from 'type-graphql'

@ObjectType({isAbstract: true})
export class Translation {
    @Field()
    key: string

    @Field({nullable: true})
    translation: string
}
