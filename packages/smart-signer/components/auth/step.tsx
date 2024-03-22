import { ReactNode, FC, PropsWithChildren } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@hive/ui";

export interface StepProps {
    title?: string;
    description?: ReactNode;
    footer?: ReactNode;
}

const Step: FC<PropsWithChildren<StepProps>> = ({ children, description, title, footer }) => {
    return (
        <Card className='border-none shadow-none w-full'>
            <CardHeader>
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className='px-6'>
                {children}
            </CardContent>
            {footer &&
                <CardFooter className='px-6'>
                    {footer}
                </CardFooter>}
        </Card>
    )
}

export default Step;