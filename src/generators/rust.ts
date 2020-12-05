import * as camelCase from 'camelcase';

import { snakeCase } from 'snake-case';
import { BaseGenerator, GeneratorOptions } from '../base';
import { LangGenerator, TplHelper, Property, PropType } from '../interfaces';

const pascalCase = (str: string): string => camelCase(str, { pascalCase: true });

export class Rust extends BaseGenerator implements LangGenerator {
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

    protected template: string = 'rust.hbs';

    constructor(options: GeneratorOptions) {
        super(options);
    }

    protected resolveTplHelper(helper: TplHelper, data: any): string {
        switch (helper) {
            case TplHelper.typeName:
            case TplHelper.enumName:
            case TplHelper.enumValue:
                return pascalCase(data);
            case TplHelper.propName:
                return (this.protectedKeywords.includes(data) ? 'r#' : '') + snakeCase(data);
            case TplHelper.propType:
                return this.resolvePropType(data);
            default:
                return data;
        }
    }

    protected resolvePropType(prop: Property): string {
        let type = null;

        if (prop.ref) {
            type = pascalCase(prop.ref);
        } else if (prop.enum) {
            type = pascalCase(prop.enum);
        } else {
            switch (prop.type) {
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

        if (!type) {
            this.cli.warn(`Could not resolve prop type: "${prop}"`);
            type = '';
        }

        return !prop.isRequired ? `Option<${type}>` : type;
    }

    private resolveStringType(prop: Property): string {
        switch (prop.format) {
            case 'date-time':
            case 'time':
            case 'date':
                return 'DateTime<Utc>';
            case 'uuid':
                return 'Uuid';
            default:
                return 'String';
        }
    }

    protected checkForExternals(prop: Property): void {
        if (prop.format) {
            switch (prop.format) {
                case 'date-time':
                case 'time':
                case 'date':
                    this.addToExternals('chrono::{DateTime,Utc}');
                case 'uuid':
                    this.addToExternals('uuid::Uuid');
            }
        }

        if (prop.type === PropType.object) {
            this.addToExternals('std::collections::HashMap');
        }
    }

    private resolveObjectType(prop: Property): string {
        const type = prop.additionalPropertyType
            ? pascalCase(prop.additionalPropertyType)
            : 'String';
        return `HashMap<String, ${pascalCase(type)}>`;
    }
}
