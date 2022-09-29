import {
    Field,
    InputType,
    Int
} from 'type-graphql'

@InputType({isAbstract: true})
export class TravelOrderType {

    @Field({nullable: true})
    dateIssued: Date

    @Field({nullable:true})
    dateStart: Date

    @Field({nullable:true})
    dateEnd: Date

    @Field({nullable:true})
    from: string

    @Field({nullable:true})
    to: string

    @Field({nullable:true})
    reason: string

    @Field(type => Int,{nullable:true})
    vehicleId: number

    @Field({nullable:true})
    totalDistance: number

    @Field({nullable:true})
    totalConsumption: number

  /** users
   *  send only users (calculating wage and total amount )
   * */
    @Field(type => [Int!], {nullable: true})
    users: number[]
}
