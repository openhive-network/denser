'use client';

import { ESupportedLanguages } from '@hiveio/wax';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/blog/i18n/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateCommunityMutation } from './hooks/use-update-community-mutation';
import { Community } from '@transaction/lib/extended-hive.chain';
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
import { useEffect } from 'react';

const EditDialogContent = ({ data, setOpen }: { data: Community; setOpen: (open: boolean) => void }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
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
    form.reset({
      title: data.title,
      about: data.about ?? '',
      lang: (data.lang as ESupportedLanguages) ?? ESupportedLanguages.ENGLISH,
      nsfw: data.is_nsfw ?? false,
      flagText: data.flag_text ?? '',
      description: data.description ?? ''
    });
  }, [JSON.stringify(data)]);
  useEffect(() => {
    if (updateCommunityMutation.isSuccess) {
      setOpen(false);
    }
  }, [updateCommunityMutation.isSuccess, form]);
  return (
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
                disabled={updateCommunityMutation.isPending}
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
                disabled={updateCommunityMutation.isPending}
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
                disabled={updateCommunityMutation.isPending}
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
                disabled={updateCommunityMutation.isPending}
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
                disabled={updateCommunityMutation.isPending}
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
                          disabled={updateCommunityMutation.isPending}
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
                  disabled={updateCommunityMutation.isPending}
                >
                  {t('communities.edit_props_dialog.cancel')}
                </Button>
                <Button type="submit" variant="redHover" disabled={updateCommunityMutation.isPending}>
                  {updateCommunityMutation.isPending ? (
                    <CircleSpinner loading={updateCommunityMutation.isPending} size={18} color="#dc2626" />
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
  );
};

export default EditDialogContent;
