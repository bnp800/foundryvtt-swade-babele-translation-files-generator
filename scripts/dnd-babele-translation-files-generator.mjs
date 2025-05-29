import { CompendiumExporterApp } from './app/compendium-exporter-app.mjs';

Hooks.on('init', () => {
    Handlebars.registerHelper("includes", function (array, value) {
        return Array.isArray(array) && array.includes(value);
    });
    
    game.settings.register("dnd-btfg", "packs-mappings", {
        scope: 'client',
        config: false,
        type: Object,
        default: {}
    });
});

Hooks.on("renderCompendiumDirectory", (app, html) => {
    if (!game.user.isGM) return;

    html = html instanceof HTMLElement ? html : html[0];
    CompendiumExporterApp.injectSidebarButton(html);
});