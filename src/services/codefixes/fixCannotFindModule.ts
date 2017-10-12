/* @internal */
namespace ts.codefix {
    registerCodeFix({
        errorCodes: [
            Diagnostics.Cannot_find_module_0.code,
            Diagnostics.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type.code,
        ],
        getCodeActions: context => {
            const { sourceFile, span: { start } } = context;
            const token = getTokenAtPosition(sourceFile, start, /*includeJsDocComment*/ false);
            if (!isStringLiteral(token)) {
                throw Debug.fail(); // These errors should only happen on the module name.
            }

            const action = tryGetCodeActionForInstallPackageTypes(context.host, token.text);
            return action && [action];
        },
    });

    export function tryGetCodeActionForInstallPackageTypes(host: LanguageServiceHost, moduleName: string): CodeAction | undefined {
        const { packageName } = getPackageName(moduleName);

        // We want to avoid looking this up in the registry as that is expensive. So first check that it's actually an NPM package.
        const validationResult = JsTyping.validatePackageName(packageName);
        if (validationResult !== JsTyping.PackageNameValidationResult.Ok) {
            return undefined;
        }

        const registry = host.tryGetTypesRegistry();
        if (!registry || !registry.has(packageName)) {
            // If !registry, registry not available yet, can't do anything.
            return undefined;
        }

        const typesPackageName = `@types/${packageName}`;
        return {
            description: `Install '${typesPackageName}'`,
            changes: [],
            commands: [{ type: "install package", packageName: typesPackageName }],
        };
    }
}
