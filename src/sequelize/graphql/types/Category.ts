import {
    Field,
    InputType,
    Int
}                      from 'type-graphql'
import {GraphQLUpload} from 'apollo-server-express'
import {UploadType}    from './Client'

@InputType({ isAbstract: true })
export class CategoryType {

    @Field(type => GraphQLUpload,{nullable:true})
    avatar: UploadType

    @Field({ nullable: true })
    name: string

    @Field({ nullable: true })
    description: string

    @Field({ nullable: true })
    slug: string

    @Field(type => Int, { nullable: true })
    parentId: number

}
