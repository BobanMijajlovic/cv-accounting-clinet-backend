import _, {isPlainObject as _isPlainObject} from 'lodash'
import Sequelize, {FindOptions}             from 'sequelize'
import {RequestFilterSort}                  from './types/basic'
import {IContextApp}                        from './resolvers/basic'
import {sequelize}                          from '../sequelize'

const Op = Sequelize.Op
export const operatorsAliases = {
    $eq: Op.eq,
    $ne: Op.ne,
    $gte: Op.gte,
    $gt: Op.gt,
    $lte: Op.lte,
    $lt: Op.lt,
    $not: Op.not,
    $in: Op.in,
    $notIn: Op.notIn,
    $is: Op.is,
    $like: Op.like,
    $notLike: Op.notLike,
    $iLike: Op.iLike,
    $notILike: Op.notILike,
    $regexp: Op.regexp,
    $notRegexp: Op.notRegexp,
    $iRegexp: Op.iRegexp,
    $notIRegexp: Op.notIRegexp,
    $between: Op.between,
    $notBetween: Op.notBetween,
    $overlap: Op.overlap,
    $contains: Op.contains,
    $contained: Op.contained,
    $adjacent: Op.adjacent,
    $strictLeft: Op.strictLeft,
    $strictRight: Op.strictRight,
    $noExtendRight: Op.noExtendRight,
    $noExtendLeft: Op.noExtendLeft,
    $and: Op.and,
    $or: Op.or,
    $any: Op.any,
    $all: Op.all,
    $values: Op.values,
    $col: Op.col
}

export const transformFilter = (data: any) => {
    if (_isPlainObject(data)) {
        const obj = {}
        for (const [key, value] of Object.entries(data)) {
            if (!key.startsWith('$')) {
                obj[key] = transformFilter(value)
                continue
            }
            const p = operatorsAliases[key]
            obj[p] = transformFilter(value)
        }
        return obj
    }

    if (Array.isArray(data)) {
        return data.map(x => transformFilter(x))
    }
  /** this it is string or number or some other primitive value */
    return data

}

export function requestOptions (reqData: RequestFilterSort): FindOptions {
    const _data = {
        ...reqData
    }
    if (_data.page) {
        if (!_data.perPage) {
            _data.perPage = 25
        }
        _data.offset = (_data.page - 1) * _data.perPage
        _data.limit = _data.perPage
    } else {
        if (!_data.offset) {
            _data.offset = 0
        }
        if (!_data.limit) {
            _data.limit = 1000
        }
    }
    let options = {
        offset: _data.offset,
        limit: _data.limit
    } as any

    if (reqData.filter) {
        const filter = transformFilter(reqData.filter)
        options = {
            ...options,
            where: {
                ...filter
            }
        }
    }
    reqData.sort && (options = Object.assign({order: [[reqData.sort.field, reqData.sort.direction]]}, options))
    reqData.group && (options = Object.assign({group: reqData.group}, options))
    reqData.attributes && (options = Object.assign({attributes: reqData.attributes}, options))
    const include = includeOptions(reqData)
    if (include) {
        options = {
            ...options,
            include: [
                ...include
            ]
        }
    }
    return <FindOptions>options
}

export const setUserFilterToWhereSearch = (options: FindOptions, ctx: IContextApp) => {

    if (options.where) {
        options.where = {
            [Sequelize.Op.and]: [
                {clientId: ctx.clientId},
                {
                    ...options.where
                }
            ]
        }
    } else {
        options.where = {
            clientId: ctx.clientId
        }
    }
    return options
}

export const includeOptions = (reqData: RequestFilterSort): any => {
    const includes = reqData.include
    if (!includes) {
        return undefined
    }

    const fn = (data: any) => {
        const x = Object.assign({
            required: _.get(data, 'required', false),
            model: sequelize.models[data.model],
        }, data.as && {as: data.as})
        const y = data.filter ? transformFilter(data.filter) : undefined
        let object = Object.assign({}, x, (!y ? {} : {where: {...y}}))
        if (data.include) {
            object = Object.assign({}, object, {include: [...data.include.map(yy => fn(yy))]})
        }
        return object
    }
    return reqData.include.map((data: any) => fn(data))

}
