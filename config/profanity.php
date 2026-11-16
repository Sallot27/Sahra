<?php

/*
| Words blocked in nicknames and hidden (★★★) in typed answers.
| Write them plainly, the filter normalizes them the same way as the input
| (diacritics, tatweel, alef/teh-marbuta/yeh forms, l33t digits, repeated letters).
|
| "anywhere": distinctive words, blocked even inside a longer word or when
|             spelled out letter by letter (ش ر م و ط).
| "whole":    short words that are also parts of normal words (e.g. كس in كسرة),
|             blocked only as a separate word (with or without ال / و / يا in front).
|
| Animal names (كلب، حمار…) are deliberately absent: they are real answers in إنسان حيوان.
*/

return [
    'anywhere' => [
        'شرموط', 'منيوك', 'متناك', 'قحبه', 'عاهره', 'كسمك', 'كسختك', 'كسامك', 'معرص', 'ديوث', 'زنجي', 'لوطي', 'خنيث',
        'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fagg', 'asshole', 'porn', 'pussy', 'whore', 'slut', 'boob', 'penis', 'vagina', 'bastard', 'retard', 'dildo', 'horny',
    ],
    'whole' => [
        'كس', 'زب', 'زبي', 'طيز', 'انيك', 'منيك', 'خول', 'عرص', 'يلعن', 'زق', 'خرا', 'سكس', 'عاهر', 'قحب',
        'dick', 'cock', 'sex', 'sexy', 'ass', 'nude', 'nudes', 'xxx', 'fag', 'tits', 'boobs',
    ],
];
