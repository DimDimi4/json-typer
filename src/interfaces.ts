import { JSONSchema7 } from 'json-schema';

export interface LangGenerator {
    generate(outputPath: string): void;
}

export interface Property {
    name: string;
    description?: string;
    type: string;
    required: boolean;
    format?: string;
    additionalProperty?: string;
}

export interface StructType {
    name: string;
    description?: string;
    properties: Property[];
}

export interface EnumType {
    name: string;
    values: string[];
}

export enum TplHelper {
    typeName = 'typeName',
    propType = 'propType',
    enumName = 'enumName',
    enumValue = 'enumValue',
    propName = 'propName',
}

export enum PropType {
    string = 'string',
    number = 'number',
    integer = 'integer',
    float = 'float',
    object = 'object',
    array = 'array',
    boolean = 'boolean',
    null = 'null',
}
