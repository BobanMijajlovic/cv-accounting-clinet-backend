import 'reflect-metadata'
import {
    Arg,
    Field,
    ID,
    ObjectType,
    Query,
    Resolver
} from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'

import {Translation}   from '../graphql/types/Translate'
import {
    getTranslate,
    getTranslateByLanguage
}                      from '../../server/Server'
import {omit as _omit} from 'lodash'

@ObjectType()
@Table({
    tableName: 'translate'
})

export default class Translate extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        unique: true,
        type: DataType.STRING(128)
    })
    key: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
    })
    comment: string

    @Field()
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
    })
    sr: string

    @Field()
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
    })
    en: string

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date

    public static async getTranslate (lang: string, force: boolean): Promise<Translation[]> {
        //* * force ide na server za taj language i radi update */
        if (force) {
            await getTranslateByLanguage()
        }

        const data = await Translate.findAll({
            attributes: ['key', [`${lang}`, 'translation']]
        }) as any

        return data.map(x => x.toJSON())
    }

    public static async syncTranslate () {
        const serverTranslate = await getTranslate()
        if (serverTranslate.length > 0) {
            return
        }
        const transaction = await Translate.sequelize.transaction()
        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}

        try {
            const promises = serverTranslate.map(translate => Translate.findOne({
                where: {
                    key: translate.key
                },
                ...options
            })
                .then((trans) => {
                    if (!trans) {
                        return Translate.create(translate, options)
                    }
                    return trans.update({..._omit(translate, ['key'])}, options)
                }))
            await Promise.all(promises)
            transaction.commit()
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

}

@Resolver()
export class TranslateResolver {
    @Query(returns => [Translation], {name: 'getTranslate'})
    _getTranslate (@Arg('lang', type => String)lang: string,
        @Arg('force',type => Boolean,{nullable:true})force?: boolean) {
        return Translate.getTranslate(lang,force)
    }

}

