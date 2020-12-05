import { Command } from '@oclif/command';
import * as write from 'write';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as Handlebars from 'handlebars';
import { JSONSchema7Definition, JSONSchema7 } from 'json-schema';

import { Property, Enum, TplHelper, PropType, LangGenerator, StructType } from './interfaces';

const readFile = util.promisify(fs.readFile);

export type GeneratorOptions = {
    definitions: { [key: string]: JSONSchema7Definition };
    cli: Command;
};

interface propDefs {
    [k: string]: JSONSchema7Definition;
}

export class BaseGenerator implements LangGenerator {
    protected structs: StructType[] = [];
    protected template: string = '';

    private externals: string[] = [];

    protected definitions: { [key: string]: JSONSchema7Definition };
    protected cli: Command;

    constructor(options: GeneratorOptions) {
        this.definitions = options.definitions;
        this.cli = options.cli;

        this.setupTplHelpers();
        this.prepareTypes();
    }

    private setupTplHelpers() {
        const that = this;

        Handlebars.registerHelper('not', (obj) => !obj);

        for (const helper in TplHelper) {
            if (typeof helper === 'string') {
                Handlebars.registerHelper(helper, (str: any) =>
                    that.resolveTplHelper(TplHelper[helper as keyof typeof TplHelper], str),
                );
            }
        }
    }

    protected resolveTplHelper(helper: TplHelper, str: any): string {
        switch (helper) {
            default:
                return str;
        }
    }

    private prepareTypes() {
        for (const name in this.definitions) {
            const def = this.definitions[name] as JSONSchema7;

            // for now we only working with 'object' definitions
            if (def.type !== PropType.object) {
                this.cli.warn(`Unknown type "${def.type}" for definition "${name}"`);
                continue;
            }

            if (!def.properties) {
                this.cli.warn(`Definition "${name}" has no properties`);
                continue;
            }

            this.structs.push({
                name,
                description: def.description,
                properties: this.prepareProperties(def.properties, def.required || [], name),
                enums: this.prepareEnums(def.properties, name),
            });
        }
    }

    private prepareProperties(
        propDefs: propDefs,
        required: string[],
        typeName: string,
    ): Property[] {
        const properties: Property[] = [];

        for (const name in propDefs) {
            const propDef = propDefs[name] as JSONSchema7;

            const property: Property = {
                name: name,
                type: PropType[propDef.type as keyof typeof PropType],
                description: propDef.description,
                format: propDef.format,
                isRequired: required.includes(name),
            };

            if (propDef.$ref) {
                const refParts = propDef.$ref.split('/');
                property.ref = refParts[refParts.length - 1];
            }

            if (propDef.enum) {
                property.enum = `${typeName}_${name}`;
            }

            if (propDef.additionalProperties) {
                const addProp = propDef.additionalProperties as JSONSchema7;
                property.additionalPropertyType = addProp.type as string;
            }

            this.checkForExternals(property);

            properties.push(property);
        }

        return properties;
    }

    protected checkForExternals(prop: Property): void {}

    private prepareEnums(propDefs: propDefs, typeName: string): Enum[] {
        const enums: Enum[] = [];

        for (const name in propDefs) {
            const propDef = propDefs[name] as JSONSchema7;

            if (!propDef.enum) continue;

            enums.push({
                name: `${typeName}_${name}`,
                values: propDef.enum as string[],
            });
        }

        return enums;
    }

    protected addToExternals(external: string) {
        if (!this.externals.includes(external)) this.externals.push(external);
    }

    async readTpl() {
        return readFile(path.join(__dirname, 'templates', this.template), 'utf8');
    }

    async compileTpl() {
        const tmpFile = await this.readTpl();
        return Handlebars.compile(tmpFile)({
            date: new Date(),
            externals: this.externals,
            structs: this.structs,
        });
    }

    public async generate(outputPath: string) {
        write.sync(outputPath, await this.compileTpl());
    }
}
