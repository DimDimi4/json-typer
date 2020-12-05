import * as camelCase from 'camelcase';

import { BaseGenerator, GeneratorOptions } from '../base';
import { Property, LangGenerator, TplHelper, PropType } from '../interfaces';

const pascalCase = (str: string): string => camelCase(str, { pascalCase: true });

export class Golang extends BaseGenerator implements LangGenerator {
    protected template: string = 'golang.hbs';

    constructor(options: GeneratorOptions) {
        super(options);
    }

    protected resolveTplHelper(helper: TplHelper, data: any): string {
        switch (helper) {
            case TplHelper.typeName:
            case TplHelper.enumName:
            case TplHelper.enumValue:
            case TplHelper.propName:
                return pascalCase(data);
            case TplHelper.propType:
                return this.resolvePropType(data);
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
                    return this.resolveArrayType(prop);
                case PropType.boolean:
                    return 'bool';
                case PropType.null:
                    return 'nil';
                case PropType.number:
                    return 'uint64';
                case PropType.integer:
                    return 'int64';
                case PropType.float:
                    return 'float64';
            }
        }

        if (!type) {
            this.cli.warn(`Could not resolve prop type: "${prop}"`);
            type = '';
        }

        return !prop.isRequired ? `${type}` : type;
    }

    private resolveStringType(prop: Property): string {
        switch (prop.format) {
            case 'date-time':
            case 'time':
            case 'date':
                return 'time.Time';
            default:
                return 'string';
        }
    }

    protected checkForExternals(prop: Property): void {
        switch (prop.format) {
            case 'date-time':
            case 'time':
            case 'date':
                this.addToExternals('time');
        }
    }

    private resolveObjectType(prop: Property): string {
        const type = prop.additionalPropertyType
            ? camelCase(prop.additionalPropertyType)
            : 'string';

        return `map[string]${type}`;
    }

    private resolveArrayType(prop: Property): string {
        const type = prop.additionalPropertyType
            ? camelCase(prop.additionalPropertyType)
            : 'string';

        return `[]${type}`;
    }
}
