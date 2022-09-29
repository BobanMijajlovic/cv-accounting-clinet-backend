import {
    Request,
    Response
}                         from 'express'
import {
    Arg,
    Args,
    ClassType,
    Ctx,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                         from 'type-graphql'
import { Model }          from 'sequelize-typescript'
import {
    FindOptions,
    InstanceUpdateOptions
}                         from 'sequelize'
import pluralize          from 'pluralize'
import {
    checkJWT,
    updateModelBefore
}                         from '../middlewares'
import { requestOptions } from '../FilterRequest'
import {
    get as _get,
    lowerFirst as _lowerFirst
}                         from 'lodash'
import {
    PaginatedResponse,
    RequestFilterSort
}                         from '../types/basic'
import Tax                from '../../models/Tax.model'

export type TSelectAll<T> = {
    rows: T[];
    count: number
}

export  type TModelResponseSelectAll<T> = Promise<TSelectAll<T>>
export  type TModelResponse<T> = Promise<T | null>
export  type TModelResponseArray<T> = Promise<T[]>

export interface IJwtData {
    clientId: number;
    userId: number
}

export interface IContextApp {
    req: Request,
    res: Response,
    jwtData: IJwtData
    clientId: number | null
    userId: number | null
    taxes?: Promise<Tax[]>
}

interface ICreateBaseResolve {
    updateInputType: ClassType,
    insertInputType: ClassType,
    selectOne?: (id: number, ctx?: IContextApp)=> Promise<Model | null>
    selectAll?: (options: FindOptions, ctx?: IContextApp)=> Promise<{ rows: Model[]; count: number }>
    updateOne?: (id: number, data: InstanceUpdateOptions, ctx?: IContextApp)=> Promise<Model>
    insertOne?: (data: object, ctx?: IContextApp)=> Promise<any>
}

export function createBaseResolver (ModelClass: ClassType, options: ICreateBaseResolve) {
    const className = ModelClass.name

    const plural = pluralize.plural(className)

    const InsertType = options.insertInputType
    const UpdateType = options.updateInputType

    @ObjectType(`response${plural}`)
    class ClassPaginationResponse extends PaginatedResponse(ModelClass) {
    }

    @Resolver({ isAbstract: true })
    abstract class BaseResolver {

        @UseMiddleware(checkJWT)
        @Query(returns => ModelClass, { nullable: true, name: `${_lowerFirst(className).replace(/\s+/, '')}`, })
        _qModelGetOne (@Arg('id', type => Int)id: number,
            @Ctx() ctx: IContextApp) {
            const fn = options.selectOne ? options.selectOne : _get(ModelClass, 'selectOne')
            return fn ? fn(id, ctx) : Error('Select one function not exists')
        }

        @UseMiddleware(checkJWT)
        @Query(returns => ClassPaginationResponse, { name: `${_lowerFirst(plural).replace(/\s+/, '')}` })
        async _qModelSelectAll (@Ctx() ctx: IContextApp,
            @Args() request: RequestFilterSort) {
            const find = requestOptions(request)
            const fn = options.selectAll ? options.selectAll : _get(ModelClass, 'selectAll')
            if (!fn) {
                return Error('Select All not exists')
            }
            const result = await fn(find, ctx)
            return {
                items: result.rows,
                count: result.count,
                perPage: find.limit,
                page: Math.floor(find.offset / find.limit) + 1,
                hasMore: true
            }
        }

        @UseMiddleware(checkJWT, updateModelBefore)
        @Mutation(returns => ModelClass, { name: `update${className}` })
        _qModelUpdateOne (@Arg('id', type => Int)id: number,
                     // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                     // @ts-ignore
            @Arg('data', type => UpdateType) data: UpdateType,
            @Ctx() ctx: IContextApp) {
            const fn = options.updateOne ? options.updateOne : _get(ModelClass, 'updateOne')
            return fn ? fn(id, data, ctx) : Error('Update One not implemented')
        }

        @UseMiddleware(checkJWT)
        @Mutation(returns => ModelClass, { name: `insert${className}` })
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
        _qModelInsertOne (@Arg('data', type => InsertType) data: InsertType,
            @Ctx() ctx: IContextApp) {
            const fn = options.insertOne ? options.insertOne : _get(ModelClass, 'insertOne')
            return fn ? fn(data, ctx) : Error('Insert action not available')
        }
    }

    return BaseResolver
}
