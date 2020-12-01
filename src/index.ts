import { Command, flags } from '@oclif/command';
import { JSONSchema7 } from 'json-schema';
import * as jsonfile from 'jsonfile';

import { Rust } from './generators/rust';
import { Golang } from './generators/golang';
import { LangGenerator } from './interfaces';

class JsonTyper extends Command {
    static description = 'Generates types (Go, Rust) from json schema';

    static flags = {
        version: flags.version({ char: 'v' }),
        help: flags.help({ char: 'h' }),
        spec: flags.string({
            char: 's',
            description: 'spec source path',
            required: true,
        }),
        output: flags.string({
            char: 'o',
            description: 'output path',
            required: true,
        }),
        language: flags.string({
            char: 'l',
            description: 'generation language',
            options: ['rust', 'golang'],
            required: true,
        }),
        // languageConfig: flags.string({ char: 'c', description: 'language config file' }),
    };

    async run() {
        const { flags } = this.parse(JsonTyper);

        const spec: JSONSchema7 = await jsonfile.readFile(flags.spec);

        if (!spec.definitions) {
            return this.error('missing property "definitions" in spec file');
        }

        if (Object.keys(spec.definitions).length == 0) {
            return this.error('property "definitions" is empty');
        }

        let langGenerator: LangGenerator;

        switch (flags.language) {
            case 'golang':
                langGenerator = new Golang({
                    definitions: spec.definitions,
                    cli: this,
                });
                break;
            case 'rust':
                langGenerator = new Rust({
                    definitions: spec.definitions,
                    cli: this,
                });
                break;

            default:
                this.error('Language not supported');
        }

        await langGenerator.generate(flags.output);
    }
}

export = JsonTyper;
