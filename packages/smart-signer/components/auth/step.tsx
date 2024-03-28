import { ReactNode, FC, PropsWithChildren } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@hive/ui";
import { Icons } from "@hive/ui/components/icons";

export interface StepProps {
    title?: string;
    description?: ReactNode;
    footer?: ReactNode;
    loading?: boolean;
}

const Step: FC<PropsWithChildren<StepProps>> = ({ children, description, title, footer, loading = false }) => {
    return (
        <Card className='border-none shadow-none w-full bg-transparent dark:bg-background/95 dark:text-white'>
            {loading &&
                <div className="absolute flex justify-center items-center top-0 left-0 right-0 bottom-0 rounded-md">
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-10 rounded-md" />
                    <Icons.spinner className="animate-spin z-10 text-white" />
                </div>}
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