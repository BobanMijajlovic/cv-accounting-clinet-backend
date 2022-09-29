import {
  Field,
  InputType,
  Int
} from 'type-graphql';


@InputType({isAbstract: true})
export class VehicleType {

  @Field({nullable:true})
  brand: string

  @Field({nullable:true})
  model: string

  @Field({nullable:true})
  registrationNumber: string

  @Field(type=>Int,{nullable:true})
  fuelTypeId: number

  @Field({nullable:true})
  consumption: number

  @Field(type=>Int,{nullable:true})
  hasNorm: number
}

@InputType({isAbstract:true})
export class FuelType {
  @Field({nullable:true})
  type: string

  @Field({nullable:true})
  name: string
}
