'use client'

import React from 'react'

interface Props {
    props?: string
    slogan?: string
}

/**
 * The promo strip above the header is switched off: it renders nothing.
 * The props are accepted so existing pages keep compiling; remove them together with the component when
 * a real announcement bar is designed.
 */
const TopNavOne: React.FC<Props> = () => {
    return null;
}

export default TopNavOne;
