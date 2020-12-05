export interface LangGenerator {
    generate(outputPath: string): void;
}

export interface Property {
    name: string;
    type?: PropType | undefined;
    description?: string;
    format?: string;
    ref?: string;
    enum?: string;
    additionalPropertyType?: string;
    isRequired: boolean;
}

export interface Enum {
    name: string;
    values: string[];
}

export interface StructType {
    name: string;
    description?: string;
    properties: Property[];
    enums?: Enum[];
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
