<?php

return [
    /*
    | private:    everything, including the film, Disney and Spacetoon categories
    |             (for the owner's own gatherings).
    | commercial: only original content, safe to sell or publish.
    */
    'edition' => env('SAHRA_EDITION', 'private') === 'commercial' ? 'commercial' : 'private',

    /*
    | Optional purchase codes for opening a room on the big screen, comma
    | separated (e.g. SAHRA_HOST_CODES=SAHRA-7K2Q,SAHRA-PARTY). Players never
    | need a code. Leave empty to let anyone host.
    */
    'host_codes' => array_values(array_filter(array_map(
        fn ($c) => strtoupper(trim($c)),
        explode(',', (string) env('SAHRA_HOST_CODES', ''))
    ))),
];
