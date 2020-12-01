import { Command } from '@oclif/command';
import * as write from 'write';
import * as fs from 'fs';
import * as util from 'util';
import * as Handlebars from 'handlebars';
import { JSONSchema7Definition, JSONSchema7 } from 'json-schema';

import { StructType, EnumType, Property, TplHelper, PropType } from './interfaces';

const readFile = util.promisify(fs.readFile);

export type GeneratorOptions = {
    definitions: { [key: string]: JSONSchema7Definition };
    cli: Command;
};

export class BaseGenerator {
    private externals: string[] = [];
    protected structs: StructType[] = [];
    protected enums: EnumType[] = [];

    protected tpl: string = '';

    private definitions: { [key: string]: JSONSchema7Definition };
    private cli: Command;

    constructor(options: GeneratorOptions) {
        this.definitions = options.definitions;
        this.cli = options.cli;

        this.setupTplHelpers();

        this.prepareTypes();
    }

    private setupTplHelpers() {
        const that = this;
        for (const helper in TplHelper) {
            if (typeof helper === 'string') {
                Handlebars.registerHelper(helper, (str) =>
                    that.resolveTplHelper(TplHelper[helper as keyof typeof TplHelper], str),
                );
            }
        }
    }

    protected resolveTplHelper(_: TplHelper, str: string): string {
        return str;
    }

    protected addToExternals(external: string) {
        if (!this.externals.includes(external)) this.externals.push(external);
    }

    private refType(ref: string) {
        const parts = ref.split('/');
        return parts[parts.length - 1];
    }

    protected resolvePropType(_: PropType, prop: JSONSchema7): string {
        return prop.type as string;
    }

    protected getPropType(prop: JSONSchema7): string {
        return prop['$ref']
            ? this.refType(prop['$ref'])
            : this.resolvePropType(PropType[prop.type as keyof typeof PropType], prop);
    }

    private prepareStruct(typeName: string, def: JSONSchema7) {
        if (!def.properties) {
            return this.cli.warn(`Definition "${typeName}" has no properties`);
        }

        const properties: Property[] = [];

        for (let propName in def.properties) {
            const prop = def.properties[propName] as JSONSchema7;

            if (prop.enum) {
                const enumName = `${typeName}_${propName}`;
                prop.$ref = '/enum/' + enumName;
                this.enums.push({
                    name: enumName,
                    values: prop.enum as string[],
                });
            }

            const property: Property = {
                name: propName,
                description: prop.description,
                type: this.getPropType(prop),
                required: def.required?.includes(propName) || false,
                format: prop.format,
            };

            if (prop.additionalProperties) {
                property.additionalProperty = this.getPropType(
                    prop.additionalProperties as JSONSchema7,
                );
            }

            properties.push(property);
        }

        this.structs.push({
            name: typeName,
            description: def.description,
            properties,
        });
    }

    private prepareTypes() {
        Object.keys(this.definitions).forEach((typeName) => {
            const def = this.definitions[typeName] as JSONSchema7;
            // for now we only working with 'object' definitions
            if (def.type === PropType.object) this.prepareStruct(typeName, def);
            else this.cli.warn(`Unknown type "${def.type}" for definition "${typeName}"`);
        });
    }

    async readTpl() {
        return readFile(this.tpl, 'utf8');
    }

    async compileTpl() {
        const tmpFile = await this.readTpl();
        return Handlebars.compile(tmpFile)({
            date: new Date(),
            externals: this.externals,
            structs: this.structs,
            enums: this.enums,
        });
    }

    public async generate(outputPath: string) {
        write.sync(outputPath, await this.compileTpl());
    }
}
