import { Stream } from 'stream'
import {
    Field,
    InputType
}                 from 'type-graphql'

@InputType({ isAbstract: true })
export class FileType {
    @Field()
    filename: string
    @Field()
    mimetype: string
    @Field()
    encoding: string
}

export interface Upload {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: ()=> Stream;
}
