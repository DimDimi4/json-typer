import * as path from 'path';
import * as camelCase from 'camelcase';
import { snakeCase } from 'snake-case';
import { JSONSchema7 } from 'json-schema';

import { BaseGenerator, GeneratorOptions } from '../base';
import { LangGenerator, TplHelper, PropType } from '../interfaces';

const pascalCase = (str: string): string => camelCase(str, { pascalCase: true });

export class Rust extends BaseGenerator {
    private protectedKeywords: string[] = [
        // Special reserved identifiers used internally for elided lifetimes,
        // unnamed method parameters, crate root module, error recovery etc.
        '{{root}}',
        '$crate',

        // Keywords used in the language.
        'as',
        'box',
        'break',
        'const',
        'continue',
        'crate',
        'else',
        'enum',
        'extern',
        'false',
        'fn',
        'for',
        'if',
        'impl',
        'in',
        'let',
        'loop',
        'match',
        'mod',
        'move',
        'mut',
        'pub',
        'ref',
        'return',
        'self',
        'Self',
        'static',
        'struct',
        'super',
        'trait',
        'true',
        'type',
        'unsafe',
        'use',
        'where',
        'while',

        // Keywords reserved for future use.
        'abstract',
        'alignof',
        'become',
        'do',
        'final',
        'macro',
        'offsetof',
        'override',
        'priv',
        'proc',
        'pure',
        'sizeof',
        'typeof',
        'unsized',
        'virtual',
        'yield',

        // Weak keywords, have special meaning only in specific contexts.
        'catch',
        'default',
        'dyn',
        "'static",
        'union',
    ];

    constructor(options: GeneratorOptions) {
        super(options);

        this.tpl = path.join(__dirname, 'rust.hbs');
    }

    protected resolveTplHelper(helper: TplHelper, str: string): string {
        switch (helper) {
            case TplHelper.propType:
                return new RegExp(['HashMap', 'DateTime', 'Uuid'].join('|')).test(str)
                    ? str
                    : pascalCase(str);
            case TplHelper.typeName:
            case TplHelper.enumName:
            case TplHelper.enumValue:
                return pascalCase(str);
            case TplHelper.propName:
                return (this.protectedKeywords.includes(str) ? 'r#' : '') + snakeCase(str);
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
            case PropType.boolean:
                return 'bool';
            case PropType.null:
                return '!';
            case PropType.number:
                return 'u64';
            case PropType.integer:
                return 'i64';
            case PropType.float:
                return 'f64';
        }
    }

    private resolveStringType(prop: JSONSchema7): string {
        switch (prop.format) {
            case 'date-time':
            case 'time':
            case 'date':
                this.addToExternals('chrono::{DateTime,Utc}');
                return 'DateTime<Utc>';

            case 'uuid':
                this.addToExternals('uuid::Uuid');
                return 'Uuid';

            default:
                return 'String';
        }
    }

    private resolveObjectType(prop: JSONSchema7): string {
        this.addToExternals('std::collections::HashMap');

        const type = prop.additionalProperties
            ? this.getPropType(prop.additionalProperties as JSONSchema7)
            : 'String';

        return `HashMap<String, ${pascalCase(type)}>`;
    }
}
