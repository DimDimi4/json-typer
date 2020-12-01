import * as path from 'path';
import * as write from 'write';
import * as camelCase from 'camelcase';
import { snakeCase } from 'snake-case';
import { JSONSchema7 } from 'json-schema';

import { BaseGenerator, GeneratorOptions } from '../base';
import { LangGenerator, TplHelper, PropType } from '../interfaces';

const pascalCase = (str: string): string => camelCase(str, { pascalCase: true });

enum primitives {
    string = 'string',
    number = 'uint64',
    integer = 'int64',
    float = 'float64',
    object = 'map',
    boolean = 'bool',
    null = 'nil',
}

export class Golang extends BaseGenerator implements LangGenerator {
    constructor(options: GeneratorOptions) {
        super(options);

        this.tpl = path.join(__dirname, 'golang.hbs');
    }

    protected resolveTplHelper(helper: TplHelper, str: string): string {
        switch (helper) {
            case TplHelper.propType:
                return str;
            case TplHelper.typeName:
            case TplHelper.enumName:
            case TplHelper.enumValue:
            case TplHelper.propName:
                return pascalCase(str);
            default:
                return str;
        }
    }

    protected resolvePropType(type: PropType, prop: JSONSchema7): string {
        switch (type) {
            case PropType.string:
                return this.resolveStringType(prop);
            case PropType.object:
                return this.resolveObjectType(prop);
            case PropType.array:
                return this.resolveArrayType(prop);
            case PropType.boolean:
                return primitives.boolean;
            case PropType.null:
                return primitives.null;
            case PropType.number:
                return primitives.number;
            case PropType.integer:
                return primitives.integer;
            case PropType.float:
                return primitives.float;
        }
    }

    private resolveStringType(prop: JSONSchema7): string {
        switch (prop.format) {
            case 'date-time':
            case 'time':
            case 'date':
                this.addToExternals('time');
                return 'time.Time';
            default:
                return primitives.string;
        }
    }

    private resolveObjectType(prop: JSONSchema7): string {
        const type = prop.additionalProperties
            ? this.getPropType(prop.additionalProperties as JSONSchema7)
            : primitives.null;

        return `map[string]${type}`;
    }

    private resolveArrayType(prop: JSONSchema7): string {
        const type = prop.additionalProperties
            ? this.getPropType(prop.additionalProperties as JSONSchema7)
            : primitives.null;

        return `[]${type}`;
    }
}
