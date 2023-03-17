import * as React from 'react';

interface Props {
    message: string;
}

export const RssMessage = ({message}: Props) => (<div>{message}</div>);
