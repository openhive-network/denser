import { ESupportedLanguages } from '@hiveio/wax';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@smart-signer/lib/auth/use-user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@ui/components/dialog';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateCommunityMutation } from './hooks/use-update-community-mutation';
import { Community } from '@transaction/lib/bridge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ui/components/form';
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Button
} from '@ui/components';
import { CircleSpinner } from 'react-spinners-kit';
import { useEffect, useState } from 'react';

const EditCommunityDialog = ({ data }: { data: Community }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const updateCommunityMutation = useUpdateCommunityMutation();
  const createCommunitySchema = z.object({
    title: z
      .string()
      .min(3, {
        message: t('communities.edit_props_dialog.errors.minimum_characters', {
          value: 3
        })
      })
      .max(20, {
        message: t('communities.edit_props_dialog.errors.maximum_characters', {
          value: 20
        })
      }),
    about: z.string().max(120, {
      message: t('communities.edit_props_dialog.errors.maximum_characters', {
        value: 120
      })
    }),
    lang: z.nativeEnum(ESupportedLanguages),
    nsfw: z.boolean(),
    flagText: z.string(),
    description: z.string()
  });
  type UpdateCommunityFormValues = z.infer<typeof createCommunitySchema>;
  const form = useForm<UpdateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    mode: 'onSubmit',
    defaultValues: {
      title: data.title,
      about: data.about ?? '',
      lang: (data.lang as ESupportedLanguages) ?? ESupportedLanguages.ENGLISH,
      nsfw: data.is_nsfw ?? false,
      flagText: data.flag_text ?? '',
      description: data.description ?? ''
    }
  });
  const onSubmit = async (values: UpdateCommunityFormValues) => {
    const { title, about, lang, nsfw, flagText, description } = values;
    try {
      await updateCommunityMutation.mutateAsync({
        communityName: data.name,
        title,
        about,
        flagText,
        description,
        editor: user.username,
        lang,
        nsfw
      });
    } catch (error) {
      handleError(error, {
        method: 'create_community',
        params: {
          title,
          about,
          editor: user.username,
          lang,
          nsfw,
          flagText,
          description
        }
      });
    }
  };
  useEffect(() => {
    if (updateCommunityMutation.isSuccess) {
      form.reset();
      setOpen(false);
    }
  }, [updateCommunityMutation.isSuccess, form]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-sm text-destructive">{t('communities.edit_props')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('communities.edit_props_dialog.community_settings')}</DialogTitle>
          <DialogDescription>
            {t('communities.edit_props_dialog.community_settings_description')}
          </DialogDescription>
          <div className="flex-col gap-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  disabled={updateCommunityMutation.isLoading}
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.edit_props_dialog.title')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={updateCommunityMutation.isLoading}
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.edit_props_dialog.about')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={updateCommunityMutation.isLoading}
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.edit_props_dialog.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={updateCommunityMutation.isLoading}
                  control={form.control}
                  name="flagText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.edit_props_dialog.flag_text')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  disabled={updateCommunityMutation.isLoading}
                  control={form.control}
                  name="lang"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('communities.edit_props_dialog.lang')}</FormLabel>
                      <FormControl>
                        <Select {...field} onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ESupportedLanguages).map(([key, value]) => (
                              <SelectItem key={key} value={value}>
                                {t(`communities.edit_props_dialog.languages.${value}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nsfw"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={updateCommunityMutation.isLoading}
                          />
                        </FormControl>
                        <FormLabel>{t('communities.edit_props_dialog.nsfw')}</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex w-full items-center justify-between">
                  <Button
                    onClick={() => {
                      form.reset();
                      setOpen(false);
                    }}
                    variant="outlineRed"
                    disabled={updateCommunityMutation.isLoading}
                  >
                    {t('communities.edit_props_dialog.cancel')}
                  </Button>
                  <Button type="submit" variant="redHover" disabled={updateCommunityMutation.isLoading}>
                    {updateCommunityMutation.isLoading ? (
                      <CircleSpinner loading={updateCommunityMutation.isLoading} size={18} color="#dc2626" />
                    ) : (
                      t('communities.edit_props_dialog.save')
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default EditCommunityDialog;
